#Node-watch

This module will watch a directory recursively by default while trying to solve several problems caused by the native fs.watch():


1. When modifying a file inside a watched directory, the callback function will be triggered multiple times; 
2. when modifying a watched file with an editor like vim, the callback function will only be triggered one time and then it is unwatched.


In current version it does not differentiate event like "rename" or "delete". Once there is a change, the callback function will be triggered.

## Installation

    npm install node-watch

## Example

    var watch = require('node-watch');

    watch('somedir_or_somefile', function(filename) {
      console.log(filename, ' changed.');
    });

