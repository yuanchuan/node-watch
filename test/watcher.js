var assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  tmp = require('tmp'),
  watch = require('../lib/watch');

describe('watcher', function(){
  var tmpDir;
  var names = ['one', 'two', 'three'];

  beforeEach(function(done) {
    tmp.dir({ unsafeCleanup: true }, function(err, dir) {
      if (err) return done(err);
      tmpDir = dir;
      names.forEach(function(name) {
        var sub = path.join(dir, name);
        fs.mkdirSync(sub);
        names.forEach(function(name) {
          var f = path.join(sub, name);
          fs.writeFileSync(f, 'test');
        });
      });
      setTimeout(done, 1500);
    });
  });

  it('should provide an array of all FSWatcher objects', function(done) {
    var watcher = watch(tmpDir, function() {});
    assert.equal(watcher.watchers.length, 1);

    setTimeout(function() {
      assert.equal(watcher.watchers.length, 4);
      fs.mkdirSync(path.join(tmpDir, 'four'));

      setTimeout(function() {
        assert.equal(watcher.watchers.length, 5);
        done();
      }, 500);
    }, 100);
  });

  it('should provide a close method that closes all watchers', function(done) {
    var watcher = watch(tmpDir, function() {}), closed = 0;

    assert.equal(watcher.watchers.length, 1);
    assert.equal(closed, 0);

    setTimeout(function() {
      assert.equal(watcher.watchers.length, 4);
      watcher.watchers.forEach(function(watcher) {
        watcher._close = watcher.close;
        watcher.close = function() { watcher._close(); closed++; };
      });

      watcher.close();

      assert.equal(watcher.watchers.length, 0);
      assert.equal(closed, 4);
      done();
    }, 100);
  });

  it('should proxy events from all watchers', function(done) {
    var watcher = watch(tmpDir, function(f) {}), changed = 0;
    setTimeout(function() {
      watcher.on('change', function() { changed++; });
      fs.appendFileSync(path.join(tmpDir, 'one', 'one'), 'test event');

      setTimeout(function() {
        assert.equal(changed, 1);
        done();
      }, 200);
    }, 100);
  });
});
