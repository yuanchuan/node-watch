var fs = require('fs');
var path = require('path');
var os = require('os');

function matchObject(item, str) {
  return Object.prototype.toString.call(item)
    === '[object ' + str + ']';
}

function checkStat(err) {
  if (err) {
    if (/^(ENOENT|EPERM|EACCES)$/.test(err.code)) {
      if (err.code !== 'ENOENT') {
        console.warn('Warning: Cannot access %s', name);
      }
      return false;
    }
    throw err;
  }
  return true;
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
    return new Promise(resolve => {
      fs.access(name, fs.constants.F_OK, (err) => {
        resolve(!err)
      })
    })
  },
  file: async function(name) {
    return new Promise((resolve) => {
      return fs.stat(name, (err, stats) => {
        resolve(checkStat(err) && stats.isFile())
      })
    })
  },
  samePath: function(a, b) {
    return path.resolve(a) === path.resolve(b);
  },
  directory: async function(name) {
    return new Promise((resolve) => {
      return fs.stat(name, (err, stats) => {
        resolve(checkStat(err) && stats.isDirectory())
      })
    })
  },
  symbolicLink: function(name) {
    return new Promise((resolve) => {
      return fs.lstat(name, (err, stats) => {
        resolve(checkStat(err) && stats.isSymbolicLink())
      })
    })
  },
  windows: function() {
    return os.platform() === 'win32';
  }
};

module.exports = is;
