'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const is = require('./is');

let IS_SUPPORT;
const TEMP_DIR = os.tmpdir?.() || process.env.TMPDIR || process.env.TEMP || process.cwd();

/**
 * Manages temporary files/directories for testing native recursive support
 */
class TempStack {
  constructor() {
    this.stack = [];
  }

  /**
   * Create a unique temporary path
   * @param {'file'|'dir'} type - Type of path to create
   * @param {string} base - Base directory
   * @returns {string} - The created path name
   */
  create(type, base) {
    const name = path.join(base, `node-watch-${Math.random().toString(16).slice(2)}`);
    this.stack.push({ name, type });
    return name;
  }

  /**
   * Write content to files
   * @param {...string} files - File paths to write to
   */
  write(...files) {
    for (const file of files) {
      fs.writeFileSync(file, ' ');
    }
  }

  /**
   * Create directories
   * @param {...string} dirs - Directory paths to create
   */
  mkdir(...dirs) {
    for (const dir of dirs) {
      fs.mkdirSync(dir);
    }
  }

  /**
   * Clean up all created files and directories
   * @param {Function} [fn] - Optional callback after cleanup
   */
  cleanup(fn) {
    try {
      let temp;
      while ((temp = this.stack.pop())) {
        const { type, name } = temp;
        if (type === 'file' && is.file(name)) {
          fs.unlinkSync(name);
        } else if (type === 'dir' && is.directory(name)) {
          fs.rmdirSync(name);
        }
      }
    } finally {
      if (is.func(fn)) fn();
    }
  }
}

let pending = false;

/**
 * Detect if the platform supports native recursive watching
 * @param {Function} fn - Callback with boolean result
 * @returns {boolean|undefined}
 */
function hasNativeRecursive(fn) {
  if (!is.func(fn)) {
    return false;
  }

  if (IS_SUPPORT !== undefined) {
    return fn(IS_SUPPORT);
  }

  if (!pending) {
    pending = true;
  } else {
    // Check again later if detection is already in progress
    return setTimeout(() => hasNativeRecursive(fn), 300);
  }

  const stack = new TempStack();
  const parent = stack.create('dir', TEMP_DIR);
  const child = stack.create('dir', parent);
  const file = stack.create('file', child);

  try {
    stack.mkdir(parent, child);
  } catch (e) {
    stack = new TempStack();
    // try again under current directory
    TEMP_DIR = process.cwd();
    parent = stack.create('dir', TEMP_DIR);
    child = stack.create('dir', parent);
    file = stack.create('file', child);
    stack.mkdir(parent, child);
  }

  const options = { recursive: true };
  let watcher;

  try {
    watcher = fs.watch(parent, options);
  } catch (e) {
    if (e.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
      IS_SUPPORT = false;
      return fn(IS_SUPPORT);
    }
    throw e;
  }

  if (!watcher) {
    return false;
  }

  const timer = setTimeout(() => {
    watcher.close();
    stack.cleanup(() => {
      IS_SUPPORT = false;
      fn(IS_SUPPORT);
    });
  }, 200);

  watcher.on('change', (evt, name) => {
    if (path.basename(file) === path.basename(name)) {
      watcher.close();
      clearTimeout(timer);
      stack.cleanup(() => {
        IS_SUPPORT = true;
        fn(IS_SUPPORT);
      });
    }
  });

  stack.write(file);
}

module.exports = hasNativeRecursive;
