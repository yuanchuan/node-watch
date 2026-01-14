'use strict';

const assert = require('assert');
const Tree = require('./utils/builder');
const watch = require('../lib/watch');
const is = require('../lib/is');
const hasNativeRecursive = require('../lib/has-native-recursive');

let tree = Tree();
let watcher;

beforeEach(() => {
  tree = Tree();
});

afterEach((done) => {
  if (watcher && !watcher.isClosed()) {
    watcher.on('close', done);
    watcher.close();
  } else {
    done();
  }
});

after(() => {
  if (tree) {
    tree.cleanup();
  }
});

/**
 * Retry assertion until it passes or timeout
 * @param {Function} fn - Assertion function
 * @param {number} timeout - Timeout in milliseconds
 */
function wait(fn, timeout) {
  try {
    fn();
  } catch (error) {
    timeout -= 30;
    if (timeout >= 0) {
      setTimeout(() => {
        wait(fn, timeout);
      }, 30);
    } else {
      throw error;
    }
  }
}

describe('process events', () => {
  it('should emit `close` event', (done) => {
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);
    watcher = watch(fpath, () => {});
    watcher.on('close', () => {
      done();
    });
    watcher.close();
  });

  it('should emit `ready` event when watching a file', (done) => {
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);
    watcher = watch(fpath);
    watcher.on('ready', () => {
      done();
    });
  });

  it('should emit `ready` event when watching a directory recursively', (done) => {
    const dir = tree.getPath('home');
    watcher = watch(dir, { recursive: true });
    watcher.on('ready', () => {
      done();
    });
  });

  it('should emit `ready` properly in a composed watcher', (done) => {
    const dir1 = tree.getPath('home/a');
    const dir2 = tree.getPath('home/b');
    const file = tree.getPath('home/b/file1');
    watcher = watch([dir1, dir2, file], { recursive: true });
    watcher.on('ready', () => {
      done();
    });
  });
});

describe('watch for files', () => {
  it('should watch a single file and keep watching', (done) => {
    let times = 1;
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);
    watcher = watch(fpath, { delay: 0 }, (evt, name) => {
      assert.strictEqual(fpath, name);
      if (times++ >= 3) {
        done();
      }
    });
    watcher.on('ready', () => {
      tree.modify(file);
      tree.modify(file, 100);
      tree.modify(file, 200);
    });
  });

  it('should watch files inside a directory', (done) => {
    const fpath = tree.getPath('home/a');
    const stack = [
      tree.getPath('home/a/file1'),
      tree.getPath('home/a/file2')
    ];
    watcher = watch(fpath, { delay: 0 }, (evt, name) => {
      stack.splice(stack.indexOf(name), 1);
      if (!stack.length) done();
    });

    watcher.on('ready', () => {
      tree.modify('home/a/file1');
      tree.modify('home/a/file2', 100);
    });
  });

  it('should ignore duplicate changes', (done) => {
    const file = 'home/a/file2';
    const fpath = tree.getPath(file);
    let times = 0;
    watcher = watch(fpath, { delay: 200 }, (evt, name) => {
      if (fpath === name) times++;
    });
    watcher.on('ready', () => {
      tree.modify(file);
      tree.modify(file, 100);
      tree.modify(file, 150);

      wait(() => {
        assert.strictEqual(times, 1);
        done();
      }, 250);
    });
  });

  it('should listen to new created files', (done) => {
    const home = tree.getPath('home');
    const newfile1 = 'home/a/newfile' + Math.random();
    const newfile2 = 'home/a/newfile' + Math.random();
    const changes = [];
    watcher = watch(home, { delay: 0, recursive: true }, (evt, name) => {
      changes.push(name);
    });
    watcher.on('ready', () => {
      tree.newFile(newfile1);
      tree.newFile(newfile2);
      wait(() => {
        // On windows it will report its parent directory along with the filename
        // https://github.com/yuanchuan/node-watch/issues/79
        if (is.windows()) {
          // Make sure new files are detected
          assert.ok(
            changes.includes(tree.getPath(newfile1)) &&
            changes.includes(tree.getPath(newfile2))
          );
          // It should only include new files and its parent directory
          // if there are more than 2 events
          if (changes.length > 2) {
            const accepts = [
              tree.getPath(newfile1),
              tree.getPath(newfile2),
              tree.getPath('home/a')
            ];
            changes.forEach((name) => {
              assert.ok(accepts.includes(name), name + ' should not be included');
            });
          }
        } else {
          assert.deepStrictEqual(
            changes,
            [tree.getPath(newfile1), tree.getPath(newfile2)]
          );
        }
        done();
      }, 100);
    });
  });

  it('should error when parent gets deleted before calling fs.watch', (done) => {
    const fpath = tree.getPath('home/a/file1');
    watcher = watch(fpath, Object.defineProperty({}, 'test', {
      enumerable: true,
      get() {
        tree.remove('home/a');
        return 'test';
      }
    }));
    watcher.on('error', () => {
      done();
    });
  });
});

describe('watch for directories', () => {
  it('should watch directories inside a directory', (done) => {
    const home = tree.getPath('home');
    const dir = tree.getPath('home/c');
    const events = [];

    watcher = watch(home, { delay: 0, recursive: true }, (evt, name) => {
      if (name === dir) {
        events.push(evt);
      }
    });
    watcher.on('ready', () => {
      tree.remove('home/c');

      wait(() => {
        assert.deepStrictEqual(events, ['remove']);
        done();
      }, 400);
    });
  });

  it('should watch new created directories', (done) => {
    const home = tree.getPath('home');
    watcher = watch(home, { delay: 0, recursive: true }, (evt, name) => {
      if (name === tree.getPath('home/new/file1')) {
        done();
      }
    });
    watcher.on('ready', () => {
      // newFile() will create the 'new/' directory and the 'new/file1' file,
      // but, only the creation of the directory is observed.
      // Because of that, there will only be one event for file1, when it
      // is modified, not when it is created.
      tree.newFile('home/new/file1');
      tree.modify('home/new/file1', 100);
    });
  });

  it('should not watch new created directories which are being skipped in the filter', (done) => {
    const home = tree.getPath('home');
    const options = {
      delay: 0,
      recursive: true,
      filter(filePath, skip) {
        if (/ignored/.test(filePath)) return skip;
        return true;
      }
    };

    watcher = watch(home, options, (evt, name) => {
      assert.fail('event detect', name);
    });

    watcher.on('ready', () => {
      tree.newFile('home/ignored/file');
      tree.modify('home/ignored/file', 100);
      wait(done, 150);
    });
  });

  it('should keep watching after removal of sub directory', (done) => {
    const home = tree.getPath('home');
    const file1 = tree.getPath('home/e/file1');
    const file2 = tree.getPath('home/e/file2');
    const dir = tree.getPath('home/e/sub');
    const events = [];
    watcher = watch(home, { delay: 0, recursive: true }, (evt, name) => {
      if (name === dir || name === file1 || name === file2) {
        events.push(name);
      }
    });
    watcher.on('ready', () => {
      tree.remove('home/e/sub', 50);
      tree.modify('home/e/file1', 100);
      tree.modify('home/e/file2', 200);

      wait(() => {
        assert.deepStrictEqual(events, [dir, file1, file2]);
        done();
      }, 300);
    });
  });

  it('should watch new directories without delay', (done) => {
    const home = tree.getPath('home');
    const events = [];
    watcher = watch(home, { delay: 200, recursive: true }, (evt, name) => {
      if (name === tree.getPath('home/new/file1')) {
        events.push(evt);
      }
    });
    watcher.on('ready', () => {
      tree.newFile('home/new/file1');
      tree.modify('home/new/file1', 50);
      tree.modify('home/new/file1', 100);
      wait(() => {
        assert.deepStrictEqual(events, ['update']);
        done();
      }, 350);
    });
  });

  it('should error when directory gets deleted before calling fs.watch', (done) => {
    const dir = 'home/c';
    const fpath = tree.getPath(dir);
    watcher = watch(fpath, Object.defineProperty({}, 'test', {
      enumerable: true,
      get() {
        tree.remove(dir);
        return 'test';
      }
    }));
    watcher.on('error', () => {
      done();
    });
  });
});

describe('file events', () => {
  it('should identify `remove` event', (done) => {
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);
    watcher = watch(fpath, (evt, name) => {
      if (evt === 'remove' && name === fpath) done();
    });
    watcher.on('ready', () => {
      tree.remove(file);
    });
  });

  it('should identify `remove` event on directory', (done) => {
    const dir = 'home/a';
    const home = tree.getPath('home');
    const fpath = tree.getPath(dir);
    watcher = watch(home, (evt, name) => {
      if (evt === 'remove' && name === fpath) done();
    });
    watcher.on('ready', () => {
      tree.remove(dir);
    });
  });

  it('should be able to handle many events on deleting', (done) => {
    const dir = 'home/a';
    const fpath = tree.getPath(dir);
    const names = tree.newRandomFiles(dir, 300);

    let count = 0;
    watcher = watch(fpath, () => {
      count += 1;
      if (count === names.length) done();
    });

    watcher.on('ready', () => {
      names.forEach(tree.remove.bind(tree));
    });
  });

  it('should identify `update` event', (done) => {
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);
    watcher = watch(fpath, (evt, name) => {
      if (evt === 'update' && name === fpath) done();
    });
    watcher.on('ready', () => {
      tree.modify(file);
    });
  });

  it('should report `update` on new files', (done) => {
    const dir = tree.getPath('home/a');
    const file = 'home/a/newfile' + Date.now();
    const fpath = tree.getPath(file);
    watcher = watch(dir, (evt, name) => {
      if (evt === 'update' && name === fpath) done();
    });
    watcher.on('ready', () => {
      tree.newFile(file);
    });
  });
});

describe('options', () => {
  describe('recursive', () => {
    it('should watch recursively with `recursive: true` option', (done) => {
      const dir = tree.getPath('home');
      const file = tree.getPath('home/bb/file1');
      watcher = watch(dir, { recursive: true }, (evt, name) => {
        if (file === name) {
          done();
        }
      });
      watcher.on('ready', () => {
        tree.modify('home/bb/file1');
      });
    });
  });

  describe('encoding', () => {
    it('should throw on invalid encoding', (done) => {
      const dir = tree.getPath('home/a');
      try {
        watcher = watch(dir, 'unknown');
      } catch (e) {
        done();
      }
    });

    it('should accept options as an encoding string', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      const fpath = tree.getPath(file);
      watcher = watch(dir, 'utf8', (evt, name) => {
        assert.strictEqual(name.toString(), fpath);
        done();
      });
      watcher.on('ready', () => {
        tree.modify(file);
      });
    });

    it('should support buffer encoding', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      const fpath = tree.getPath(file);
      watcher = watch(dir, 'buffer', (evt, name) => {
        assert(Buffer.isBuffer(name), 'not a Buffer');
        assert.strictEqual(name.toString(), fpath);
        done();
      });
      watcher.on('ready', () => {
        tree.modify(file);
      });
    });

    it('should support base64 encoding', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      const fpath = tree.getPath(file);
      watcher = watch(dir, 'base64', (evt, name) => {
        assert.strictEqual(
          name,
          Buffer.from(fpath).toString('base64'),
          'wrong base64 encoding'
        );
        done();
      });
      watcher.on('ready', () => {
        tree.modify(file);
      });
    });

    it('should support hex encoding', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      const fpath = tree.getPath(file);
      watcher = watch(dir, 'hex', (evt, name) => {
        assert.strictEqual(
          name,
          Buffer.from(fpath).toString('hex'),
          'wrong hex encoding'
        );
        done();
      });
      watcher.on('ready', () => {
        tree.modify(file);
      });
    });
  });

  describe('filter', () => {
    it('should only watch filtered directories', (done) => {
      let matchRegularDir = false;
      let matchIgnoredDir = false;

      const options = {
        delay: 0,
        recursive: true,
        filter(name) {
          return !/deep_node_modules/.test(name);
        }
      };

      watcher = watch(tree.getPath('home'), options, (evt, name) => {
        if (/deep_node_modules/.test(name)) {
          matchIgnoredDir = true;
        } else {
          matchRegularDir = true;
        }
      });
      watcher.on('ready', () => {
        tree.modify('home/b/file1');
        tree.modify('home/deep_node_modules/ma/file1');

        wait(() => {
          assert(matchRegularDir, 'watch failed to detect regular file');
          assert(!matchIgnoredDir, 'fail to ignore path `deep_node_modules`');
          done();
        }, 100);
      });
    });

    it('should only report filtered files', (done) => {
      const dir = tree.getPath('home');
      const file1 = 'home/bb/file1';
      const file2 = 'home/bb/file2';

      const options = {
        delay: 0,
        recursive: true,
        filter(name) {
          return /file2/.test(name);
        }
      };

      let times = 0;
      let matchIgnoredFile = false;
      watcher = watch(dir, options, (evt, name) => {
        times++;
        if (name === tree.getPath(file1)) {
          matchIgnoredFile = true;
        }
      });
      watcher.on('ready', () => {
        tree.modify(file1);
        tree.modify(file2, 50);

        wait(() => {
          assert.strictEqual(times, 1, 'should only report /home/bb/file2 once');
          assert.strictEqual(matchIgnoredFile, false, 'home/bb/file1 should be ignored');
          done();
        }, 100);
      });
    });

    it('should be able to filter with regexp', (done) => {
      const dir = tree.getPath('home');
      const file1 = 'home/bb/file1';
      const file2 = 'home/bb/file2';

      const options = {
        delay: 0,
        recursive: true,
        filter: /file2/
      };

      let times = 0;
      let matchIgnoredFile = false;
      watcher = watch(dir, options, (evt, name) => {
        times++;
        if (name === tree.getPath(file1)) {
          matchIgnoredFile = true;
        }
      });
      watcher.on('ready', () => {
        tree.modify(file1);
        tree.modify(file2, 50);

        wait(() => {
          assert(times, 1, 'report file2');
          assert(!matchIgnoredFile, 'home/bb/file1 should be ignored');
          done();
        }, 100);
      });
    });

    it('should be able to skip subdirectories with `skip` flag', (done) => {
      const home = tree.getPath('home');
      const options = {
        delay: 0,
        recursive: true,
        filter(name, skip) {
          if (/\/deep_node_modules/.test(name)) return skip;
        }
      };
      watcher = watch(home, options);

      watcher.getWatchedPaths((paths) => {
        hasNativeRecursive((supportRecursive) => {
          const watched = supportRecursive
            // The skip flag has no effect to the platforms which support recursive option,
            // so the home directory is the only one that's in the watching list.
            ? [home]
            // The deep_node_modules and all its subdirectories should not be watched
            // with skip flag specified in the filter.
            : tree.getAllDirectories().filter((name) => {
                return !/\/deep_node_modules/.test(name);
              });

          assert.deepStrictEqual(watched.sort(), paths.sort());
          done();
        });
      });
    });
  });

  describe('delay', () => {
    it('should have delayed response', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      let start;
      watcher = watch(dir, { delay: 300 }, () => {
        assert(Date.now() - start >= 300, 'delay not working');
        done();
      });
      watcher.on('ready', () => {
        start = Date.now();
        tree.modify(file);
      });
    });
  });
});

describe('parameters', () => {
  it('should throw error on non-existed file', (done) => {
    const somedir = tree.getPath('home/somedir');
    watcher = watch(somedir);
    watcher.on('error', (err) => {
      if (err.message.includes('does not exist')) {
        done();
      }
    });
  });

  it('should accept filename as Buffer', (done) => {
    const fpath = tree.getPath('home/a/file1');
    watcher = watch(Buffer.from(fpath), { delay: 0 }, (evt, name) => {
      assert.strictEqual(name, fpath);
      done();
    });
    watcher.on('ready', () => {
      tree.modify('home/a/file1');
    });
  });

  it('should compose array of files or directories', (done) => {
    const file1 = 'home/a/file1';
    const file2 = 'home/a/file2';
    const fpaths = [
      tree.getPath(file1),
      tree.getPath(file2)
    ];

    let times = 0;
    watcher = watch(fpaths, { delay: 0 }, (evt, name) => {
      if (fpaths.indexOf(name) !== -1) times++;
      if (times === 2) done(); // calling done more than twice causes mocha test to fail
    });

    watcher.on('ready', () => {
      tree.modify(file1);
      tree.modify(file2, 50);
    });
  });

  it('should filter duplicate events for composed watcher', (done) => {
    const home = 'home';
    const dir = 'home/a';
    const file1 = 'home/a/file1';
    const file2 = 'home/a/file2';
    const fpaths = [
      tree.getPath(home),
      tree.getPath(dir),
      tree.getPath(file1),
      tree.getPath(file2)
    ];

    const changes = [];
    watcher = watch(fpaths, { delay: 100, recursive: true }, (evt, name) => {
      changes.push(name);
    });

    watcher.on('ready', () => {
      tree.modify(file1);
      tree.modify(file2, 50);

      wait(() => {
        assert.deepStrictEqual(
          changes,
          [tree.getPath(file1), tree.getPath(file2)]
        );
        done();
      }, 200);
    });
  });
});

describe('watcher object', () => {
  it('should using watcher object to watch', (done) => {
    const dir = tree.getPath('home/a');
    const file = 'home/a/file1';
    const fpath = tree.getPath(file);

    watcher = watch(dir, { delay: 0 });
    watcher.on('ready', () => {
      watcher.on('change', (evt, name) => {
        assert.strictEqual(evt, 'update');
        assert.strictEqual(name, fpath);
        done();
      });
      tree.modify(file);
    });
  });

  describe('close()', () => {
    it('should close a watcher using .close()', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      let times = 0;
      watcher = watch(dir, { delay: 0 });
      watcher.on('change', () => {
        times++;
      });
      watcher.on('ready', () => {
        watcher.close();

        tree.modify(file);
        tree.modify(file, 100);

        wait(() => {
          assert(watcher.isClosed(), 'watcher should be closed');
          assert.strictEqual(times, 0, 'failed to close the watcher');
          done();
        }, 150);
      });
    });

    it('should not watch after .close() is called', (done) => {
      const dir = tree.getPath('home');
      watcher = watch(dir, { delay: 0, recursive: true });
      watcher.close();

      watcher.getWatchedPaths((dirs) => {
        assert(dirs.length === 0);
        done();
      });
    });

    it('Do not emit after close', (done) => {
      const dir = tree.getPath('home/a');
      const file = 'home/a/file1';
      let times = 0;
      watcher = watch(dir, { delay: 0 });
      watcher.on('change', () => {
        times++;
      });
      watcher.on('ready', () => {
        watcher.close();

        const timer = setInterval(() => {
          tree.modify(file);
        });

        wait(() => {
          clearInterval(timer);
          assert(watcher.isClosed(), 'watcher should be closed');
          assert.strictEqual(times, 0, 'failed to close the watcher');
          done();
        }, 100);
      });
    });
  });

  describe('getWatchedPaths()', () => {
    it('should get all the watched paths', (done) => {
      const home = tree.getPath('home');
      watcher = watch(home, {
        delay: 0,
        recursive: true
      });
      watcher.getWatchedPaths((paths) => {
        hasNativeRecursive((supportRecursive) => {
          const watched = supportRecursive
            // The home directory is the only one that's being watched
            // if the recursive option is natively supported.
            ? [home]
            // Otherwise it should include all its subdirectories.
            : tree.getAllDirectories();

          assert.deepStrictEqual(watched.sort(), paths.sort());
          done();
        });
      });
    });

    it('should get its parent path instead of the file itself', (done) => {
      const file = tree.getPath('home/a/file1');
      // The parent path is actually being watched instead.
      const parent = tree.getPath('home/a');

      watcher = watch(file, { delay: 0 });

      watcher.getWatchedPaths((paths) => {
        assert.deepStrictEqual([parent], paths);
        done();
      });
    });

    it('should work correctly with composed watcher', (done) => {
      const a = tree.getPath('home/a');

      const b = tree.getPath('home/b');
      const file = tree.getPath('home/b/file1');

      const nested = tree.getPath('home/deep_node_modules');
      const ma = tree.getPath('home/deep_node_modules/ma');
      const mb = tree.getPath('home/deep_node_modules/mb');
      const mc = tree.getPath('home/deep_node_modules/mc');

      watcher = watch([a, file, nested], {
        delay: 0,
        recursive: true
      });

      watcher.getWatchedPaths((paths) => {
        hasNativeRecursive((supportRecursive) => {
          const watched = supportRecursive
            ? [a, b, nested]
            : [a, b, nested, ma, mb, mc];

          assert.deepStrictEqual(watched.sort(), paths.sort());
          done();
        });
      });
    });
  });
});
