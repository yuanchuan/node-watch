# Changelog

## 0.7.4

* Fix: add export to interface #128 (by @multivoltage)
* Catch fs.watch exceptions #125 (by @campersau )
* Fix can't listener error event on incorrect file/directory #123 (by @leijuns)

<br> <br>


## 0.7.3

* Fixed the type definition of callback function. (by @xieyuheng)
* Optimization to the guard function. (by @wmertens)
* Switched to Github Actions for CI.

<br> <br>


## 0.7.2

* Reduce the released npm package size.

<br> <br>


## 0.7.1

* Don't normalize events for Windows or it might lose essential events.
* Fix the functionality of the `.close()` method before watcher is ready.


<br> <br>


## 0.7.0

* Add an extra flag for skipping sub-directories inside filter function.

<br> <br>


## 0.6.4

* Fix `ERR_FEATURE_UNAVAILABLE_ON_PLATFORM` error for Node v14.

<br> <br>


## 0.6.3

* Types: Allow watching multiple files.

<br> <br>


## 0.6.2

* Detect temporary editor files more wisely in order to avoid side effects on Windows.

<br> <br>


## 0.6.1

* Add TypeScript support.
* Fix race condition of `fs.exists` and `fs.stat`.
* Prevent redundant events on Windows when creating file/directory.

<br> <br>


## 0.6.0
Special thanks to [Timo Tijhof](https://github.com/Krinkle)

* Drop support for node < 6.0
* Add `ready` event for the watcher.
* Lots of bug fixed.

<br> <br>


## 0.5.9
* Fix function detection.
* Emit `close` event after calling `.close()`.
* Don't emit any events after close.
* Change default `delay` to 200ms.

<br> <br>


## 0.5.8
* Fix async function detection.

<br> <br>


## 0.5.7
* Add `delay` option and set default to 100ms.

<br> <br>


## 0.5.6
* Fix recursive watch with filter option.

<br> <br>


## 0.5.5
* Remove duplicate events from a composed watcher.

<br> <br>


## 0.5.4
* Accept Buffer filename.
* Add support for `encoding` option.

<br> <br>


## 0.5.3
* The `filter` option can be of either Function or RegExp type.

<br> <br>


## 0.5.0
* The `recursive` option is default to be `false`.
* The callback function will always provide an event name.

<br> <br>


## 0.4.0
* Returns a [fs.FSWatcher](https://nodejs.org/api/fs.html#fs_class_fs_fswatcher) like object.
