/* eslint-env mocha */
var assert = require('assert');
var Tree = require('./utils/builder');
var watch = require('../lib/watch');

var tree = Tree();
var watcher;

function newBuffer(input) {
  if (Buffer.from) {
    return Buffer.from(input);
  }

  return new Buffer(input);
}

beforeEach(function(done) {
  tree = Tree();
  if (watcher && !watcher.isClosed()) watcher.close();
  setTimeout(done, 500);
});

after(function() {
  if (tree) {
    tree.cleanup();
  }
});


describe('watch for files', function() {
  it('should watch a single file and keep watching', function(done) {
    this.timeout(3000); // eslint-disable-line no-invalid-this
    var times = 1;
    var file = 'home/a/file1';
    var fpath = tree.getPath(file);
    watcher = watch(fpath, function(evt, name) {
      assert.equal(fpath, name)
      if (times++ >= 3) {
        done();
      }
    });
    tree.modify(file, 100);
    tree.modify(file, 500);
    tree.modify(file, 900);
  });

  it('should watch files inside a directory', function(done) {
    var fpath = tree.getPath('home/a');
    var stack = [
      tree.getPath('home/a/file1'),
      tree.getPath('home/a/file2')
    ];
    watcher = watch(fpath, function(evt, name) {
      stack.splice(stack.indexOf(name), 1);
      if (!stack.length) done();
    });

    tree.modify('home/a/file1', 200);
    tree.modify('home/a/file2', 300);
  });

  it('should ignore duplicate changes', function(done) {
    var file = 'home/a/file2';
    var fpath = tree.getPath(file);
    var times = 0;
    watcher = watch(fpath, function(evt, name) {
      if (fpath === name) times++;
      setTimeout(function() {
        assert(times === 1)
        done();
      }, 200);
    });
    tree.modify(file, 100);
    tree.modify(file, 120);
    tree.modify(file, 150);
  });

});


describe('watch for directoies', function() {

  it('should watch directories inside a directory', function(done) {
    var home = tree.getPath('home');
    var dir = tree.getPath('home/c');

    watcher = watch(home, { recursive: true }, function(evt, name) {
      assert.equal(dir, name);
      done();
    });

    tree.remove('home/c', 300);
  });

  it('should watch new created directories', function(done) {
    var home = tree.getPath('home');
    watcher = watch(home, { recursive: true }, function(evt, name) {
      if (name === tree.getPath('home/new/file1')) {
        done();
      }
    });
    tree.newFile('home/new/file1', 200);
    tree.modify('home/new/file1', 500);
  });
});

describe('events', function() {
  it('should identify `remove` event', function(done) {
    var file = 'home/a/file1';
    var fpath = tree.getPath(file);
    watcher = watch(fpath, function(evt, name) {
      if (evt === 'remove' && name === fpath) done();
    });
    tree.remove(file, 100);
  });

  it('should identify `update` event', function(done) {
    var file = 'home/a/file1';
    var fpath = tree.getPath(file);
    watcher = watch(fpath, function(evt, name) {
      if (evt === 'update' && name === fpath) done();
    });
    tree.modify(file, 100);
  });

  it('should emit `close` event', function(done) {
    var file = 'home/a/file1';
    var fpath = tree.getPath(file);
    watcher = watch(fpath, function() {});
    watcher.on('close', function() {
      done();
    });
    watcher.close();
  });

  it('should report `update` on new files', function(done) {
    var dir = tree.getPath('home/a');
    var file = 'home/a/newfile' + Date.now();
    var fpath = tree.getPath(file);
    watcher = watch(dir, function(evt, name) {
      if (evt === 'update' && name === fpath) done();
    });
    tree.newFile(file);
  });

});

describe('options', function() {
  describe('recursive', function() {
    it('should watch recursively with `recursive: true` option', function(done) {
      var dir = tree.getPath('home');
      var file = tree.getPath('home/bb/file1');
      watcher = watch(dir, { recursive: true }, function(evt, name) {
        assert.equal(file, name);
        done();
      });
      tree.modify('home/bb/file1', 300);
    });
  });

  describe('encoding', function() {
    it('should throw on invalid encoding', function(done) {
      var dir = tree.getPath('home/a');
      try {
        watcher = watch(dir, 'unknown');
      } catch (e) {
        done();
      }
    });

    it('should accept options as an encoding string', function(done) {
      var dir = tree.getPath('home/a');
      var file = 'home/a/file1';
      var fpath = tree.getPath(file);
      watcher = watch(dir, 'utf8', function(evt, name) {
        assert(name.toString() === fpath);
        done();
      });
      tree.modify(file, 200);
    });

    it('should support buffer encoding', function(done) {
      var dir = tree.getPath('home/a');
      var file = 'home/a/file1';
      var fpath = tree.getPath(file);
      watcher = watch(dir, 'buffer', function(evt, name) {
        assert(Buffer.isBuffer(name), 'not a Buffer')
        assert(name.toString() === fpath);
        done();
      });
      tree.modify(file, 200);
    });

    it('should support base64 encoding', function(done) {
      var dir = tree.getPath('home/a');
      var file = 'home/a/file1';
      var fpath = tree.getPath(file);
      watcher = watch(dir, 'base64', function(evt, name) {
        assert(
          name === newBuffer(fpath).toString('base64'),
          'wrong base64 encoding'
        );
        done();
      });
      tree.modify(file, 200);
    });

    it('should support hex encoding', function(done) {
      var dir = tree.getPath('home/a');
      var file = 'home/a/file1';
      var fpath = tree.getPath(file);
      watcher = watch(dir, 'hex', function(evt, name) {
        assert(
          name === newBuffer(fpath).toString('hex'),
          'wrong hex encoding'
        );
        done();
      });
      tree.modify(file, 200);
    });
  });

  describe('filter', function() {
    it('should only watch filtered directories', function(done) {
      var shouldModify = true;
      var shouldNotModify = false;

      var option = {
        recursive: true,
        filter: function(name) {
          return !/deep_node_modules/.test(name);
        }
      };

      watcher = watch(tree.getPath('home'), option, function(evt, name) {
        if (/deep_node_modules/.test(name)) {
          shouldNotModify = true;
        } else {
          shouldModify = false;
        }
      });

      tree.modify('home/b/file1', 200);
      tree.modify('home/deep_node_modules/ma/file1', 500);

      setTimeout(function() {
        assert(!shouldModify, 'watch failed');
        assert(!shouldNotModify, 'fail to ingore path `deep_node_modules`');
        done();
      }, 900);
    });

    it('should only report filtered files', function(done) {
      var dir = tree.getPath('home');
      var file1 = 'home/bb/file1';
      var file2 = 'home/bb/file2';

      var options = {
        recursive: true,
        filter: function(name) {
          return !/file1/.test(name);
        }
      }

      var times = 0;
      watcher = watch(dir, options, function(evt, name) {
        times++;
        if (name === tree.getPath(file2)) {
          assert(times, 1, 'home/bb/file1 should be ignored.');
          done();
        }
      });

      tree.modify(file1, 200);
      tree.modify(file2, 400);
    });

    it('should be able to filter with regexp', function(done) {
      var dir = tree.getPath('home');
      var file1 = 'home/bb/file1';
      var file2 = 'home/bb/file2';

      var options = {
        recursive: true,
        filter:  /file2/
      }

      var times = 0;
      watcher = watch(dir, options, function(evt, name) {
        times++;
        if (name === tree.getPath(file2)) {
          assert(times, 1, 'home/bb/file1 should be ignored.');
          done();
        }
      });

      tree.modify(file1, 200);
      tree.modify(file2, 400);
    });
  });

  describe('delay', function() {
    it('should have delayed response', function(done) {
      var dir = tree.getPath('home/a');
      var file = 'home/a/file1';
      var start;
      watcher = watch(dir, { delay: 1000 }, function(evt, name) { // eslint-disable-line no-unused-vars
        assert(Date.now() - start > 1000, 'delay not working');
        done();
      });
      setTimeout(function() {
        tree.modify(file);
        start = Date.now();
      }, 200);
    });
  });

});


describe('parameters', function() {

  it('should throw error on non-existed file', function(done) {
    var somedir = tree.getPath('home/somedir');
    try {
      watcher = watch(somedir);
    } catch(err) {
      done();
    }
  });

  it('should accept filename as Buffer', function(done) {
    var fpath = tree.getPath('home/a/file1');
    watcher = watch(newBuffer(fpath), function(evt, name) {
      assert(name === fpath);
      done();
    });
    tree.modify('home/a/file1', 100);
  });

  it('should compose array of files or directories', function(done) {
    var file1 = 'home/a/file1';
    var file2 = 'home/a/file2';
    var fpaths = [
      tree.getPath(file1),
      tree.getPath(file2)
    ];

    var times = 0;
    watcher = watch(fpaths, function(evt, name) {
      if (fpaths.indexOf(name) !== -1) times++;
      if (times === 2) done();  // calling done more than twice causes mocha test to fail
    });

    tree.modify(file1, 100);
    tree.modify(file2, 150);
  });

  it('should filter duplicate events for composed watcher', function(done) {
    var file1 = 'home';
    var file2 = 'home/a';
    var file3 = 'home/a/file2';
    var newFile = 'home/a/newfile' + Date.now();
    var fpaths = [
      tree.getPath(file1),
      tree.getPath(file2),
      tree.getPath(file3)
    ];

    var changed = [];

    watcher = watch(fpaths, { recursive: true }, function(evt, name) {
      changed.push(name);
    });

    tree.modify(file3, 100);
    tree.newFile(newFile, 200);

    setTimeout(function() {
      assert.strictEqual(changed.length, 2, 'should log extactly 2 events');
      assert(~changed.indexOf(tree.getPath(file3)), 'should include ' + file3);
      assert(~changed.indexOf(tree.getPath(newFile)), 'should include ' + newFile);
      done();
    }, 600);
  });

});


describe('watcher object', function() {

  it('should using watcher object to watch', function(done) {
    var dir = tree.getPath('home/a');
    var file = 'home/a/file1';
    var fpath = tree.getPath(file);

    watcher = watch(dir);
    watcher.on('change', function(evt, name) {
      assert(evt === 'update');
      assert(name === fpath);
      done();
    });

    tree.modify(file);
  });

  it('should close a watcher using .close()', function(done) {
    var dir = tree.getPath('home/a');
    var file = 'home/a/file1';
    var times = 0;
    watcher = watch(dir);
    watcher.on('change', function(evt, name) { // eslint-disable-line no-unused-vars
      times++;
    });
    watcher.close();

    tree.modify(file);
    tree.modify(file, 300);
    setTimeout(function() {
      assert(watcher.isClosed(), 'watcher should be closed');
      assert(times === 0, 'failed to close the watcher');
      done();
    }, 400);
  });

  it('Do not emit after close', function(done) {
    var dir = tree.getPath('home/a');
    var file = 'home/a/file1';
    var times = 0;
    watcher = watch(dir);
    watcher.on('change', function(evt, name) {
      times++;
    });

    watcher.close();

    var timer = setInterval(function() {
      tree.modify(file);
    });

    setTimeout(function() {
      clearInterval(timer);
      assert(watcher.isClosed(), 'watcher should be closed');
      assert(times === 0, 'failed to close the watcher');
      done();
    }, 400);
  });

});
