var fs = require('fs-extra');
var assert = require('assert');
var Tree = require('./utils/tree');
var tmp = require('tmp');
var watch = require('../');

tmp.setGracefulCleanup();

function modify(file) {
  fs.appendFileSync(file, "something", 'utf-8');
}

describe('filter-option', function() {
  var tree;

  beforeEach(function() {
    tree = new Tree({
      root: tmp.dirSync({ unsafeCleanup: true }).name,
      seperator: '/'
    });

    tree
      .on('add', function(node) {
        node.children
          ? fs.ensureDirSync(node.path)
          : fs.ensureFileSync(node.path);
      })
      .on('remove', function(node) {
        fs.removeSync(node.path);
      });

    tree
      .add('home/a', ['file1', 'file2', 'file3'])
      .add('home/b', ['file1', 'file2', 'file3'])
      .add('home/node_modules', ['file1'])
      .add('home/node_modules/module', ['file1']);
  });

  it('should only watch filtered directories', function(done) {

    var shouldModify = true;
    var shouldNotModify = false;

    var option = {
      filter: function(name) {
        return !/node_modules/.test(name);
      }
    };

    watch(tree.getPath('home'), option, function(name) {
      if (/node_modules/.test(name)) {
        shouldNotModify = true;
      } else {
        shouldModify = false;
      }
    });

    setTimeout(function() {
      modify(tree.getPath('home/a/file1'));
      modify(tree.getPath('home/node_modules/module/file1'));
    }, 200);

    setTimeout(function() {
      assert(!shouldModify, 'watch failed');
      assert(!shouldNotModify, 'fail to ingore path `node_modules`');
      done();
    }, 500);
  });

});
