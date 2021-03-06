var fs = require('fs-extra');
var path = require('path');

var structure = fs.readFileSync(
  path.join(__dirname, './structure'),
  'utf-8'
);

var code = structure
  .split('\n')
  .map(function(line) {
    return {
      indent: line.length - line.replace(/^\s+/,'').length,
      type: /\/$/.test(line) ? 'dir': 'file',
      text: line.replace(/^\s+|\s*\/\s*|\s+$/g, '')
    }
  })

function join(arr) {
  return arr.join('/');
}

function transform(arr) {
  var result = [];
  var temp = [];
  var indent = 0;
  arr.forEach(function(line) {
    if (!line.text) {
      return;
    }
    else if (!line.indent) {
      temp.push(line.text);
      result.push({type: line.type, text: join(temp) });
    }
    else if (indent < line.indent) {
      temp.push(line.text);
      result[result.length - 1].type = 'dir';
      result.push({type: line.type, text: join(temp) });
    }
    else if (indent === line.indent) {
      temp.pop();
      temp.push(line.text);
      result.push({type: line.type, text: join(temp) });
    }
    else if(indent > line.indent) {
      temp.pop();
      temp.pop();
      temp.push(line.text)
      result.push({type: line.type, text: join(temp) });
    }

    indent = line.indent;
  });
  return result;
}

var transformed= transform(code);
var defaultTestPath= path.join(__dirname, '__TREE__');

var delayTimers = [];

function maybeDelay(fn, delay) {
  if (delay) {
    delayTimers.push(setTimeout(fn, delay));
  } else {
    fn();
  }
}

function clearDelayTimers() {
  delayTimers.forEach(clearTimeout);
  delayTimers.length = 0;
}

module.exports = function builder() {
  clearDelayTimers();

  var root = defaultTestPath;
  transformed.forEach(function(line) {
    var target = path.join(root, line.text)
    if (line.type === 'dir') {
      fs.ensureDirSync(target);
    }
    else {
      fs.ensureFileSync(target);
    }
  });
  return {
    getPath: function(fpath, sub) {
      return path.join(root, fpath, sub || '');
    },
    modify: function(fpath, delay) {
      var filePath = this.getPath(fpath);
      maybeDelay(function() {
        fs.appendFileSync(filePath, 'hello');
      }, delay);
    },
    remove: function(fpath, delay) {
      var filePath = this.getPath(fpath);
      maybeDelay(function() {
        fs.removeSync(filePath);
      }, delay);
    },
    newFile: function(fpath, delay) {
      var filePath = this.getPath(fpath);
      maybeDelay(function() {
        fs.ensureFileSync(filePath);
      }, delay);
    },
    newRandomFiles: function(fpath, count) {
      var names = [];
      for (var i = 0; i < count; ++i) {
        var name = Math.random().toString().substr(2);
        var filePath = this.getPath(fpath, name);
        fs.ensureFileSync(filePath);
        names.push(path.join(fpath, name));
      }
      return names;
    },
    newSymLink: function(src, dist) {
      fs.ensureSymlinkSync(
        this.getPath(src),
        this.getPath(dist)
      );
    },
    newDir: function(fpath, delay) {
      var filePath = this.getPath(fpath);
      maybeDelay(function() {
        fs.ensureDirSync(filePath);
      }, delay);
    },
    cleanup: function() {
      try {
        fs.removeSync(root);
      } catch (e) {
        console.warn('cleanup failed.');
      }
    },
    getAllDirectories: function() {
      function walk(dir) {
        var ret = [];
        fs.readdirSync(dir).forEach(function(d) {
          var fpath = path.join(dir, d);
          if (fs.statSync(fpath).isDirectory()) {
            ret.push(fpath);
            ret = ret.concat(walk(fpath));
          }
        });
        return ret;
      }
      return walk(root);
    }
  }
}
