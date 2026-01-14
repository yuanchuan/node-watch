'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if an object matches a specific type string
 * @param {*} item - The item to check
 * @param {string} type - The type name to match
 * @returns {boolean}
 */
function matchObject(item, type) {
  return Object.prototype.toString.call(item) === `[object ${type}]`;
}

/**
 * Safely check file stats, handling permission errors gracefully
 * @param {string} name - File path to check
 * @param {Function} fn - Stat check function
 * @returns {boolean}
 */
function checkStat(name, fn) {
  try {
    return fn(name);
  } catch (err) {
    if (/^(ENOENT|EPERM|EACCES)$/.test(err.code)) {
      if (err.code !== 'ENOENT') {
        console.warn('Warning: Cannot access %s', name);
      }
      return false;
    }
    throw err;
  }
}

const is = {
  /**
   * Check if value is null or undefined
   * @param {*} item
   * @returns {boolean}
   */
  nil(item) {
    return item == null;
  },

  /**
   * Check if value is an array
   * @param {*} item
   * @returns {boolean}
   */
  array(item) {
    return Array.isArray(item);
  },

  /**
   * Check if object is empty (has no own enumerable properties)
   * @param {Object} item
   * @returns {boolean}
   */
  emptyObject(item) {
    for (const key in item) {
      return false;
    }
    return true;
  },

  /**
   * Check if value is a Buffer
   * @param {*} item
   * @returns {boolean}
   */
  buffer(item) {
    return Buffer.isBuffer(item);
  },

  /**
   * Check if value is a RegExp
   * @param {*} item
   * @returns {boolean}
   */
  regExp(item) {
    return matchObject(item, 'RegExp');
  },

  /**
   * Check if value is a string
   * @param {*} item
   * @returns {boolean}
   */
  string(item) {
    return matchObject(item, 'String');
  },

  /**
   * Check if value is a function
   * @param {*} item
   * @returns {boolean}
   */
  func(item) {
    return typeof item === 'function';
  },

  /**
   * Check if value is a number
   * @param {*} item
   * @returns {boolean}
   */
  number(item) {
    return matchObject(item, 'Number');
  },

  /**
   * Check if a file or directory exists
   * @param {string} name - Path to check
   * @returns {boolean}
   */
  exists(name) {
    return fs.existsSync(name);
  },

  /**
   * Check if path is a file
   * @param {string} name - Path to check
   * @returns {boolean}
   */
  file(name) {
    return checkStat(name, (n) => fs.statSync(n).isFile());
  },

  /**
   * Check if two paths resolve to the same location
   * @param {string} a - First path
   * @param {string} b - Second path
   * @returns {boolean}
   */
  samePath(a, b) {
    return path.resolve(a) === path.resolve(b);
  },

  /**
   * Check if path is a directory
   * @param {string} name - Path to check
   * @returns {boolean}
   */
  directory(name) {
    return checkStat(name, (n) => fs.statSync(n).isDirectory());
  },

  /**
   * Check if path is a symbolic link
   * @param {string} name - Path to check
   * @returns {boolean}
   */
  symbolicLink(name) {
    return checkStat(name, (n) => fs.lstatSync(n).isSymbolicLink());
  },

  /**
   * Check if running on Windows
   * @returns {boolean}
   */
  windows() {
    return os.platform() === 'win32';
  }
};

module.exports = is;
