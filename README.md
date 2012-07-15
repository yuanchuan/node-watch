#Node-watch

There are 3 problems when using the native fs.watch() function of Nodejs: 

1. It won't watch a directory recursively.
2. When modifying a file inside a watched directory, the callback function will be triggered multiple times. 
3. when modifying a watched file with an editor like vim, the callback function will only be triggered one time and then it is unwatched.

And this module is trying to solve those problems. 

(In current version it does not differentiate event like "rename" or "delete". Once there is a change, the callback function will be triggered.)

## Installation

    npm install node-watch

## Example

    var watch = require('node-watch');

    watch('somedir', function(filename) {
      console.log(filename, ' changed.');
    });

