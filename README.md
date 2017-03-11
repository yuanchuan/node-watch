# node-watch

A neat [fs.watch](http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener) wrapper.

[![NPM](https://nodei.co/npm/node-watch.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-watch.png/)


### Installation

```bash
npm install node-watch
```

### Example

```js
var watch = require('node-watch');

watch('somedir_or_somefile', { recursive: true }, function(evt, name) {
  console.log(name, ' changed.');
});
```

This is a completely rewritten version, **much faster** and in a more **memory-efficient** way.
So with recent nodejs versions under OS X or Windows you can do something like this:

```js
// watch the whole disk
watch('/', { recursive: true }, console.log);
```


### Why

* Some editors will generate temporary files which will cause the callback function to be triggered multiple times.
* When watching a single file the callback function will only be triggered once.
* <del>Missing an option to watch a directory recursively.</del>
* Recursive watch is not supported on Linux or in older versions of nodejs.


### Notice

* The `recursive` option is defaults to be `false` since v0.5.0.
* Parameters in the callback function always provide event name since v0.5.0.


### Events

The events provided by the callback function would be either `update` or `remove`.

```js
watch('./', function(evt, name) {

  if (evt == 'remove') {
    // on delete
  }

  if (evt == 'update') {
    // on create or modify
  }

});
```

### Watcher object

`watch` function returns a [fs.FSWatcher](https://nodejs.org/api/fs.html#fs_class_fs_fswatcher) like object as the same as `fs.watch`.

```js
var watcher = watch('./', { recursive: true });

watcher.on('change', function(evt, name) {
  // callback
});

watcher.on('error', function(err) {
  // handle error
});

// close
watcher.close();
```


### Extra options

* `filter`: Filter files or directories or skip to watch them.

```js
var options = {
  recursive: true,
  filter : function(name) {
    return !/node_modules/.test(name);
  }
};

// ignore node_modules
watch('mydir', options, console.log);
```

### Other ways to filter

a) filtering directly inside the callback function:

```js
watch('./', { recursive: true }, function(evt, name) {
  // ignore node_modules
  if (!/node_modules/.test(name)) {
    // do something
  }
});
```

b) filtering with higher order function:

```js
function filter(pattern, fn) {
  return function(evt, name) {
    if (pattern.test(name)) {
      fn(evt, name);
    }
  }
}

// watch only for js files
watch('.', filter(/\.js$/, console.log));
```

### Misc

##### 1. Watch mutiple files or directories in one place

```js
watch(['file1', 'file2'], console.log);
```

##### 2. Catch errors when removing watched directoies on Windows

```js
watch('somedir', console.log)
  .on('error', function() {
    // ignore it if you wish.
  });
```
