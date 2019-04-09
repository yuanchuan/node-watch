var fs = require('fs');
var path = require('path');
var os = require('os');

function matchObject(item, str) {
  return Object.prototype.toString.call(item)
    === '[object ' + str + ']';
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
  exists: function(name) {
    return fs.existsSync(name);
  },
  file: function(name) {
    return is.exists(name)
      ? fs.statSync(name).isFile() : false;
  },
  samePath: function(a, b) {
    return path.resolve(a) === path.resolve(b);
  },
  directory: function(name) {
    return is.exists(name)
      ? fs.statSync(name).isDirectory() : false;
  },
  symbolicLink: function(name) {
    return is.exists(name)
      ? fs.lstatSync(name).isSymbolicLink() : false;
  },
  windows: function() {
    return os.platform() === 'win32';
  }
};

module.exports = is;
