var EventEmitter = require('events').EventEmitter;
var inherits = require("util").inherits;

function replace(str /* ...values */) {
  [].slice.call(arguments, 1).forEach(function(val, idx) {
    var reg = new RegExp('\\$' + idx, 'gi');
    str = str.replace(reg, val);
  });
  return str;
}

function isType(input, type) {
  return Object.prototype.toString.call(input) === replace('[object $0]', type);
}

var message = {
  badType: function(str, type) {
    return replace('The "$0" must be of $1 type.', str, type);
  },
  invalidChar: function(str, c) {
    return replace('"$0" should not be included in "$1', c, str);
  },
  hasConflicts: function(name) {
    return replace('The name "$0" of inode or leaf has conflicts.', name);
  }
};

var assert = {
  type: function(str, type) {
    if (!isType(str, type)) {
      throw new Error(message.badType(str, type));
    }
  },
  shouldNotInclude: function(str, c) {
    if (~c.indexOf(str)) {
      throw new Error(message.invalidChar(str, c));
    }
  },
  hasChildNode: function(node, bool) {
    if (node && (!!node.children === !!bool)) {
      throw new Error(message.hasConflicts(node.path));
    }
  }
};

function trim(str, c) {
  var reg = new RegExp(replace('^\\$0+|\\$0+$', c || ''), 'g');
  return str.replace(reg, c || '');
}

function singular(str, c) {
  var reg = new RegExp(replace('^\\$0+', c), 'g');
  return str.replace(reg, c);
}

function init(arr) {
  assert.type(arr, 'Array');
  return arr.slice(0, arr.length - 1);
}

function last(arr) {
  assert.type(arr, 'Array');
  return arr[arr.length - 1];
}

function joinBy(sep, arr) {
  assert.type(sep, 'String');
  assert.type(arr, 'Array');
  return arr
    .filter(function(name) {
      return name.length;
    }).map(function(name) {
      return trim(name, sep);
    })
    .join(sep);
}

function getFields(node, seperator) {
  assert.type(node, 'String');
  assert.type(seperator, 'String');
  var result = trim(node, seperator);
  result = singular(result, seperator);
  return result.split(seperator);
}

function Tree(config) {
  config || (config = {});
  this.seperator = config.seperator || '.';
  this.root = config.root || '';
  this.tree = {};
  EventEmitter.call(this);
  return this;
}
inherits(Tree, EventEmitter);

Tree.prototype.add = function(inode, leaf, fn) {
  if (isType(leaf, 'Array')) {
    leaf.forEach((function(n) {
       this.add(inode, n, fn);
    }).bind(this));
    return this;
  }

  assert.type(inode, 'String');
  if (fn) {
    assert.type(fn, 'Function');
  }

  var tree = this.tree;
  var root = this.root;
  var sep = this.seperator;
  var prev = '';

  getFields(inode, sep).forEach((function(node, idx) {
    assert.hasChildNode(tree[node], false);
    prev = (prev ? (prev + sep) : '') + node;
    if (!tree[node]) {
      tree[node] = {
        name: node,
        path: joinBy(sep, [root, prev]),
        children: {}
      };
      this.emit('add', tree[node]);
      fn && fn(tree[node]);
    }
    tree = tree[node].children;
  }).bind(this));

  if (leaf !== undefined) {
    assert.type(leaf, 'String');
    assert.shouldNotInclude(leaf, sep);
    assert.hasChildNode(tree[leaf], true);
    if (!tree[leaf]) {
      tree[leaf] = {
        name: leaf,
        path: joinBy(sep, [root, inode, leaf])
      };
      this.emit('add', tree[leaf]);
      fn && fn(tree[leaf]);
    }
  }
  return this;
}

Tree.prototype.get = function(inode) {
  var tree = this.tree;
  var sep = this.seperator;
  if (!inode) return tree;

  var fields = getFields(inode, sep);
  var lastField = last(fields);
  init(fields).forEach(function(node, idx) {
    if (!tree) return null;
    var child = tree[node];
    if (!child) {
      return (tree = null);
    } else if (child.children) {
      tree = tree[node].children;
    } else {
      tree = tree[node];
    }
  });
  return tree[lastField] || {};
}

Tree.prototype.getPath = function(inode) {
  var node = this.get(inode);
  return node.path;
}

Tree.prototype.remove = function(inode, fn) {
  assert.type(inode, 'String');
  if (fn) {
    assert.type(fn, 'Function');
  }

  if (!inode) {
    this.emit('remove', this.tree);
    fn && fn(this.tree);
    this.tree = {};
    return this;
  }

  var sep = this.seperator;
  var fields = getFields(inode, sep);
  var lastField = last(fields);

  if (fields.length === 1) {
    delete ( this.tree[lastField] );
    this.emit('remove', this.tree[lastField]);
    return this;
  }

  var tree = this.get(joinBy(sep, init(fields)));
  if (tree && tree.children) {
    this.emit('remove', tree.children[lastField]);
    fn && fn(tree.children[lastField]);
    delete( tree.children[lastField] );
  }
  return this;
}

module.exports = Tree;
