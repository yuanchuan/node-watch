'use strict';

const fs = require('fs');
const path = require('path');

const structure = fs.readFileSync(path.join(__dirname, './structure'), 'utf-8');

const code = structure.split('\n').map((line) => ({
  indent: line.length - line.replace(/^\s+/, '').length,
  type: /\/$/.test(line) ? 'dir' : 'file',
  text: line.replace(/^\s+|\s*\/\s*|\s+$/g, '')
}));

/**
 * Join path segments
 * @param {string[]} arr - Path segments
 * @returns {string}
 */
function join(arr) {
  return arr.join('/');
}

/**
 * Transform parsed structure into path list
 * @param {Array} arr - Parsed structure
 * @returns {Array}
 */
function transform(arr) {
  const result = [];
  const temp = [];
  let indent = 0;

  arr.forEach((line) => {
    if (!line.text) {
      return;
    } else if (!line.indent) {
      temp.push(line.text);
      result.push({ type: line.type, text: join(temp) });
    } else if (indent < line.indent) {
      temp.push(line.text);
      result[result.length - 1].type = 'dir';
      result.push({ type: line.type, text: join(temp) });
    } else if (indent === line.indent) {
      temp.pop();
      temp.push(line.text);
      result.push({ type: line.type, text: join(temp) });
    } else if (indent > line.indent) {
      temp.pop();
      temp.pop();
      temp.push(line.text);
      result.push({ type: line.type, text: join(temp) });
    }

    indent = line.indent;
  });

  return result;
}

/**
 * Ensure directory exists (like fs-extra's ensureDirSync)
 * @param {string} dirPath - Directory path to ensure
 */
function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Ensure file exists, creating parent directories if needed (like fs-extra's ensureFileSync)
 * @param {string} filePath - File path to ensure
 */
function ensureFileSync(filePath) {
  const dir = path.dirname(filePath);
  ensureDirSync(dir);
  // Only create if it doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
}

/**
 * Remove file or directory recursively (like fs-extra's removeSync)
 * @param {string} targetPath - Path to remove
 */
function removeSync(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

/**
 * Ensure symlink exists, creating parent directories if needed
 * @param {string} srcPath - Source path
 * @param {string} destPath - Destination path
 */
function ensureSymlinkSync(srcPath, destPath) {
  const dir = path.dirname(destPath);
  ensureDirSync(dir);
  fs.symlinkSync(srcPath, destPath);
}

const transformed = transform(code);
const defaultTestPath = path.join(__dirname, '__TREE__');

const delayTimers = [];

/**
 * Execute function with optional delay
 * @param {Function} fn - Function to execute
 * @param {number} [delay] - Delay in milliseconds
 */
function maybeDelay(fn, delay) {
  if (delay) {
    delayTimers.push(setTimeout(fn, delay));
  } else {
    fn();
  }
}

/**
 * Clear all pending delay timers
 */
function clearDelayTimers() {
  delayTimers.forEach(clearTimeout);
  delayTimers.length = 0;
}

/**
 * Create a test file tree builder
 * @returns {Object} Tree builder interface
 */
module.exports = function builder() {
  clearDelayTimers();

  const root = defaultTestPath;

  transformed.forEach((line) => {
    const target = path.join(root, line.text);
    if (line.type === 'dir') {
      ensureDirSync(target);
    } else {
      ensureFileSync(target);
    }
  });

  return {
    /**
     * Get full path for a relative path
     * @param {string} fpath - Relative path
     * @param {string} [sub] - Sub path
     * @returns {string}
     */
    getPath(fpath, sub) {
      return path.join(root, fpath, sub || '');
    },

    /**
     * Modify a file (append content)
     * @param {string} fpath - File path
     * @param {number} [delay] - Delay in milliseconds
     */
    modify(fpath, delay) {
      const filePath = this.getPath(fpath);
      maybeDelay(() => {
        fs.appendFileSync(filePath, 'hello');
      }, delay);
    },

    /**
     * Remove a file or directory
     * @param {string} fpath - Path to remove
     * @param {number} [delay] - Delay in milliseconds
     */
    remove(fpath, delay) {
      const filePath = this.getPath(fpath);
      maybeDelay(() => {
        removeSync(filePath);
      }, delay);
    },

    /**
     * Create a new file
     * @param {string} fpath - File path
     * @param {number} [delay] - Delay in milliseconds
     */
    newFile(fpath, delay) {
      const filePath = this.getPath(fpath);
      maybeDelay(() => {
        ensureFileSync(filePath);
      }, delay);
    },

    /**
     * Create multiple random files
     * @param {string} fpath - Directory path
     * @param {number} count - Number of files to create
     * @returns {string[]} Array of created file paths
     */
    newRandomFiles(fpath, count) {
      const names = [];
      for (let i = 0; i < count; ++i) {
        const name = Math.random().toString().slice(2);
        const filePath = this.getPath(fpath, name);
        ensureFileSync(filePath);
        names.push(path.join(fpath, name));
      }
      return names;
    },

    /**
     * Create a symbolic link
     * @param {string} src - Source path
     * @param {string} dist - Destination path
     */
    newSymLink(src, dist) {
      ensureSymlinkSync(this.getPath(src), this.getPath(dist));
    },

    /**
     * Create a new directory
     * @param {string} fpath - Directory path
     * @param {number} [delay] - Delay in milliseconds
     */
    newDir(fpath, delay) {
      const filePath = this.getPath(fpath);
      maybeDelay(() => {
        ensureDirSync(filePath);
      }, delay);
    },

    /**
     * Clean up the test tree
     */
    cleanup() {
      try {
        removeSync(root);
      } catch (e) {
        console.warn('cleanup failed.');
      }
    },

    /**
     * Get all directories in the tree
     * @returns {string[]}
     */
    getAllDirectories() {
      function walk(dir) {
        let ret = [];
        fs.readdirSync(dir).forEach((d) => {
          const fpath = path.join(dir, d);
          if (fs.statSync(fpath).isDirectory()) {
            ret.push(fpath);
            ret = ret.concat(walk(fpath));
          }
        });
        return ret;
      }
      return walk(root);
    }
  };
};
