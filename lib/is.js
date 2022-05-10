var fs = require('fs-extra');
var path = require('path');
var os = require('os');

function matchObject(item, str) {
  return Object.prototype.toString.call(item)
    === '[object ' + str + ']';
}

function checkStat(err) {
  if (/^(ENOENT|EPERM|EACCES)$/.test(err.code)) {
    if (err.code !== 'ENOENT') {
      console.warn('Warning: Cannot access %s', name);
    }
    return false;
  } else {
    throw err;
  }
}

var is = {
  nil: function(item) {
    return item == null;
  },
  array: function(item) {
    return Array.isArray(item);
  },
  emptyObject: function(item) {
    for (var key in item) {
      return false;
    }
    return true;
  },
  buffer: function(item) {
    return Buffer.isBuffer(item);
  },
  regExp: function(item) {
    return matchObject(item, 'RegExp');
  },
  string: function(item) {
    return matchObject(item, 'String');
  },
  func: function(item) {
    return typeof item === 'function';
  },
  number: function(item) {
    return matchObject(item, 'Number');
  },
  exists: async function(name) {
    return fs.access(name, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
  },
  file: async function(name) {
    return fs.stat(name)
      .then((stats) => stats.isFile())
      .catch(checkStat)
  },
  samePath: function(a, b) {
    return path.resolve(a) === path.resolve(b);
  },
  directory: async function(name) {
    return fs.stat(name)
      .then((stats) => stats.isDirectory())
      .catch(checkStat)
  },
  symbolicLink: function(name) {
    return fs.stat(name)
      .then((stats) => stats.isSymbolicLink())
      .catch(checkStat)
  },
  windows: function() {
    return os.platform() === 'win32';
  }
};

module.exports = is;
