#Node-watch

This program is part of Markab(an instant mockup tool, still under development). 

The difference bewteen other nodewatch tools is that it does not differentiate event like "rename" or "delete". Once there is a change, the callback function will be triggered.

##Feature

*Recursively watch a directory*

##Installation

    npm install node-watch

## Example

    var watch = require('node-watch');

    watch('somedir', function(filename) {
      console.log(filename, ' changed.');
    });

