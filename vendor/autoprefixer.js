;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("visionmedia-css-parse/index.js", function(exports, require, module){

module.exports = function(css, options){
  options = options || {};

  /**
   * Positional.
   */

  var lineno = 1;
  var column = 1;

  /**
   * Update lineno and column based on `str`.
   */

  function updatePosition(str) {
    var lines = str.match(/\n/g);
    if (lines) lineno += lines.length;
    var i = str.lastIndexOf('\n');
    column = ~i ? str.length-i : column + str.length;
  }

  function position() {
    var start = { line: lineno, column: column };
    if (!options.position) return positionNoop;
    return function(node){
      node.position = {
        start: start,
        end: { line: lineno, column: column }
      };
      whitespace();
      return node;
    }
  }

  /**
   * Return `node`.
   */
  function positionNoop(node) {
    whitespace();
    return node;
  }

  /**
   * Parse stylesheet.
   */

  function stylesheet() {
    return {
      type: 'stylesheet',
      stylesheet: {
        rules: rules()
      }
    };
  }

  /**
   * Opening brace.
   */

  function open() {
    return match(/^{\s*/);
  }

  /**
   * Closing brace.
   */

  function close() {
    return match(/^}/);
  }

  /**
   * Parse ruleset.
   */

  function rules() {
    var node;
    var rules = [];
    whitespace();
    comments(rules);
    while (css[0] != '}' && (node = atrule() || rule())) {
      rules.push(node);
      comments(rules);
    }
    return rules;
  }

  /**
   * Match `re` and return captures.
   */

  function match(re) {
    var m = re.exec(css);
    if (!m) return;
    var str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }

  /**
   * Parse whitespace.
   */

  function whitespace() {
    match(/^\s*/);
  }

  /**
   * Parse comments;
   */

  function comments(rules) {
    var c;
    rules = rules || [];
    while (c = comment()) rules.push(c);
    return rules;
  }

  /**
   * Parse comment.
   */

  function comment() {
    var pos = position();
    if ('/' != css[0] || '*' != css[1]) return;

    var i = 2;
    while (null != css[i] && ('*' != css[i] || '/' != css[i + 1])) ++i;
    i += 2;

    var str = css.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i);
    column += 2;
    return pos({
      type: 'comment',
      comment: str
    });
  }

  /**
   * Parse selector.
   */

  function selector() {
    var m = match(/^([^{]+)/);
    if (!m) return;
    return m[0].trim().split(/\s*,\s*/);
  }

  /**
   * Parse declaration.
   */

  function declaration() {
    var pos = position();

    // prop
    var prop = match(/^(\*?[-\w]+)\s*/);
    if (!prop) return;
    prop = prop[0];

    // :
    if (!match(/^:\s*/)) return;

    // val
    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
    if (!val) return;

    var ret = pos({
      type: 'declaration',
      property: prop,
      value: val[0].trim()
    });

    // ;
    match(/^[;\s]*/);
    return ret;
  }

  /**
   * Parse declarations.
   */

  function declarations() {
    var decls = [];

    if (!open()) return;
    comments(decls);

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      comments(decls);
    }

    if (!close()) return;
    return decls;
  }

  /**
   * Parse keyframe.
   */

  function keyframe() {
    var m;
    var vals = [];
    var pos = position();

    while (m = match(/^(from|to|\d+%|\.\d+%|\d+\.\d+%)\s*/)) {
      vals.push(m[1]);
      match(/^,\s*/);
    }

    if (!vals.length) return;

    return pos({
      type: 'keyframe',
      values: vals,
      declarations: declarations()
    });
  }

  /**
   * Parse keyframes.
   */

  function atkeyframes() {
    var pos = position();
    var m = match(/^@([-\w]+)?keyframes */);

    if (!m) return;
    var vendor = m[1];

    // identifier
    var m = match(/^([-\w]+)\s*/);
    if (!m) return;
    var name = m[1];

    if (!open()) return;
    comments();

    var frame;
    var frames = [];
    while (frame = keyframe()) {
      frames.push(frame);
      comments();
    }

    if (!close()) return;

    return pos({
      type: 'keyframes',
      name: name,
      vendor: vendor,
      keyframes: frames
    });
  }

  /**
   * Parse supports.
   */

  function atsupports() {
    var pos = position();
    var m = match(/^@supports *([^{]+)/);

    if (!m) return;
    var supports = m[1].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'supports',
      supports: supports,
      rules: style
    });
  }

  /**
   * Parse media.
   */

  function atmedia() {
    var pos = position();
    var m = match(/^@media *([^{]+)/);

    if (!m) return;
    var media = m[1].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'media',
      media: media,
      rules: style
    });
  }

  /**
   * Parse paged media.
   */

  function atpage() {
    var pos = position();
    var m = match(/^@page */);
    if (!m) return;

    var sel = selector() || [];
    var decls = [];

    if (!open()) return;
    comments();

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      comments();
    }

    if (!close()) return;

    return pos({
      type: 'page',
      selectors: sel,
      declarations: decls
    });
  }

  /**
   * Parse document.
   */

  function atdocument() {
    var pos = position();
    var m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) return;

    var vendor = m[1].trim();
    var doc = m[2].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'document',
      document: doc,
      vendor: vendor,
      rules: style
    });
  }

  /**
   * Parse import
   */

  function atimport() {
    return _atrule('import');
  }

  /**
   * Parse charset
   */

  function atcharset() {
    return _atrule('charset');
  }

  /**
   * Parse namespace
   */

  function atnamespace() {
    return _atrule('namespace')
  }

  /**
   * Parse non-block at-rules
   */

  function _atrule(name) {
    var pos = position();
    var m = match(new RegExp('^@' + name + ' *([^;\\n]+);'));
    if (!m) return;
    var ret = { type: name };
    ret[name] = m[1].trim();
    return pos(ret);
  }

  /**
   * Parse at rule.
   */

  function atrule() {
    return atkeyframes()
      || atmedia()
      || atsupports()
      || atimport()
      || atcharset()
      || atnamespace()
      || atdocument()
      || atpage();
  }

  /**
   * Parse rule.
   */

  function rule() {
    var pos = position();
    var sel = selector();

    if (!sel) return;
    comments();

    return pos({
      type: 'rule',
      selectors: sel,
      declarations: declarations()
    });
  }

  return stylesheet();
};


});
require.register("visionmedia-css-stringify/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Compressed = require('./lib/compress');
var Identity = require('./lib/identity');

/**
 * Stringfy the given AST `node`.
 *
 * @param {Object} node
 * @param {Object} [options]
 * @return {String}
 * @api public
 */

module.exports = function(node, options){
  options = options || {};

  var compiler = options.compress
    ? new Compressed(options)
    : new Identity(options);

  return compiler.compile(node);
};


});
require.register("visionmedia-css-stringify/lib/compress.js", function(exports, require, module){

/**
 * Expose compiler.
 */

module.exports = Compiler;

/**
 * Initialize a new `Compiler`.
 */

function Compiler(options) {
  options = options || {};
}

/**
 * Compile `node`.
 */

Compiler.prototype.compile = function(node){
  return node.stylesheet
    .rules.map(this.visit, this)
    .join('');
};

/**
 * Visit `node`.
 */

Compiler.prototype.visit = function(node){
  return this[node.type](node);
};

/**
 * Visit comment node.
 */

Compiler.prototype.comment = function(node){
  if (this.compress) return '';
};

/**
 * Visit import node.
 */

Compiler.prototype.import = function(node){
  return '@import ' + node.import + ';';
};

/**
 * Visit media node.
 */

Compiler.prototype.media = function(node){
  return '@media '
    + node.media
    + '{'
    + node.rules.map(this.visit, this).join('')
    + '}';
};

/**
 * Visit document node.
 */

Compiler.prototype.document = function(node){
  var doc = '@' + (node.vendor || '') + 'document ' + node.document;

  return doc
    + '{'
    + node.rules.map(this.visit, this).join('')
    + '}';
};

/**
 * Visit charset node.
 */

Compiler.prototype.charset = function(node){
  return '@charset ' + node.charset + ';';
};

/**
 * Visit supports node.
 */

Compiler.prototype.supports = function(node){
  return '@supports '
    + node.supports
    + ' {\n'
    + this.indent(1)
    + node.rules.map(this.visit, this).join('\n\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit keyframes node.
 */

Compiler.prototype.keyframes = function(node){
  return '@'
    + (node.vendor || '')
    + 'keyframes '
    + node.name
    + '{'
    + node.keyframes.map(this.visit, this).join('')
    + '}';
};

/**
 * Visit keyframe node.
 */

Compiler.prototype.keyframe = function(node){
  var decls = node.declarations;

  return node.values.join(',')
    + '{'
    + decls.map(this.visit, this).join('')
    + '}';
};

/**
 * Visit page node.
 */

Compiler.prototype.page = function(node){
  var sel = node.selectors.length
    ? node.selectors.join(', ') + ' '
    : '';

  return '@page ' + sel
    + '{\n'
    + this.indent(1)
    + node.declarations.map(this.visit, this).join('\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit rule node.
 */

Compiler.prototype.rule = function(node){
  var decls = node.declarations;
  if (!decls.length) return '';

  return node.selectors.join(',')
    + '{'
    + decls.map(this.visit, this).join('')
    + '}';
};

/**
 * Visit declaration node.
 */

Compiler.prototype.declaration = function(node){
  return node.property + ':' + node.value + ';';
};


});
require.register("visionmedia-css-stringify/lib/identity.js", function(exports, require, module){

/**
 * Expose compiler.
 */

module.exports = Compiler;

/**
 * Initialize a new `Compiler`.
 */

function Compiler(options) {
  options = options || {};
  this.indentation = options.indent;
}

/**
 * Compile `node`.
 */

Compiler.prototype.compile = function(node){
  return node.stylesheet
    .rules.map(this.visit, this)
    .join('\n\n');
};

/**
 * Visit `node`.
 */

Compiler.prototype.visit = function(node){
  return this[node.type](node);
};

/**
 * Visit comment node.
 */

Compiler.prototype.comment = function(node){
  return this.indent() + '/*' + node.comment + '*/';
};

/**
 * Visit import node.
 */

Compiler.prototype.import = function(node){
  return '@import ' + node.import + ';';
};

/**
 * Visit media node.
 */

Compiler.prototype.media = function(node){
  return '@media '
    + node.media
    + ' {\n'
    + this.indent(1)
    + node.rules.map(this.visit, this).join('\n\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit document node.
 */

Compiler.prototype.document = function(node){
  var doc = '@' + (node.vendor || '') + 'document ' + node.document;

  return doc + ' '
    + ' {\n'
    + this.indent(1)
    + node.rules.map(this.visit, this).join('\n\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit charset node.
 */

Compiler.prototype.charset = function(node){
  return '@charset ' + node.charset + ';\n';
};

/**
 * Visit supports node.
 */

Compiler.prototype.supports = function(node){
  return '@supports '
    + node.supports
    + ' {\n'
    + this.indent(1)
    + node.rules.map(this.visit, this).join('\n\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit keyframes node.
 */

Compiler.prototype.keyframes = function(node){
  return '@'
    + (node.vendor || '')
    + 'keyframes '
    + node.name
    + ' {\n'
    + this.indent(1)
    + node.keyframes.map(this.visit, this).join('\n')
    + this.indent(-1)
    + '}';
};

/**
 * Visit keyframe node.
 */

Compiler.prototype.keyframe = function(node){
  var decls = node.declarations;

  return this.indent()
    + node.values.join(', ')
    + ' {\n'
    + this.indent(1)
    + decls.map(this.visit, this).join('\n')
    + this.indent(-1)
    + '\n' + this.indent() + '}\n';
};

/**
 * Visit page node.
 */

Compiler.prototype.page = function(node){
  var sel = node.selectors.length
    ? node.selectors.join(', ') + ' '
    : '';

  return '@page ' + sel
    + '{\n'
    + this.indent(1)
    + node.declarations.map(this.visit, this).join('\n')
    + this.indent(-1)
    + '\n}';
};

/**
 * Visit rule node.
 */

Compiler.prototype.rule = function(node){
  var indent = this.indent();
  var decls = node.declarations;
  if (!decls.length) return '';

  return node.selectors.map(function(s){ return indent + s }).join(',\n')
    + ' {\n'
    + this.indent(1)
    + decls.map(this.visit, this).join('\n')
    + this.indent(-1)
    + '\n' + this.indent() + '}';
};

/**
 * Visit declaration node.
 */

Compiler.prototype.declaration = function(node){
  return this.indent() + node.property + ': ' + node.value + ';';
};

/**
 * Increase, decrease or return current indentation.
 */

Compiler.prototype.indent = function(level) {
  this.level = this.level || 1;

  if (null != level) {
    this.level += level;
    return '';
  }

  return Array(this.level).join(this.indentation || '  ');
};

});
require.register("autoprefixer/data/browsers.js", function(exports, require, module){
(function() {
  module.exports = {
    android: {
      prefix: "-webkit-",
      minor: true,
      versions: [4.2, 4.1, 4, 3, 2.3, 2.2, 2.1],
      popularity: [0.11786, 1.33745, 1.40919, 0.00512434, 1.97287, 0.189601, 0.0871138]
    },
    bb: {
      prefix: "-webkit-",
      minor: true,
      versions: [10, 7],
      popularity: [0, 0.114401]
    },
    chrome: {
      prefix: "-webkit-",
      future: [29, 28],
      versions: [27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4],
      popularity: [6.23274, 23.488, 0.55497, 0.742806, 0.708654, 0.631812, 0.589122, 0.12807, 0.119532, 0.145146, 0.136608, 0.12807, 0.162222, 0.145146, 0.153684, 0.162222, 0.196374, 0.136608, 0.034152, 0.04269, 0.025614, 0.025614, 0.025614, 0.025614]
    },
    ff: {
      prefix: "-moz-",
      future: [23, 22],
      versions: [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3.6, 3.5, 3, 2],
      popularity: [3.75672, 8.81122, 0.452514, 0.264678, 0.281754, 0.537894, 0.332982, 0.247602, 0.204912, 0.375672, 0.17076, 0.196374, 0.093918, 0.08538, 0.059766, 0.059766, 0.068304, 0.110994, 0.358596, 0.059766, 0.08538, 0.025614]
    },
    ie: {
      prefix: "-ms-",
      future: [11],
      versions: [10, 9, 8, 7, 6, 5.5],
      popularity: [7.50785, 8.3027, 7.45601, 0.466541, 0.207351, 0.009298]
    },
    ios: {
      prefix: "-webkit-",
      future: [7],
      versions: [6, 6.1, 5, 5.1, 4.2, 4.3, 4, 4.1, 3.2],
      popularity: [3.094025, 3.094025, 0.352705, 0.352705, 0.055874, 0.055874, 0.00698425, 0.00698425, 0.00698426]
    },
    opera: {
      prefix: "-o-",
      future: [15],
      versions: [12.1, 12, 11.6, 11.5, 11.1, 11, 10.6, 10.5, 10, 10.1, 9.5, 9.6],
      popularity: [0.623274, 0.068304, 0.04269, 0.017076, 0.008538, 0.008538, 0.008538, 0.008565, 0.008538, 0.008538, 0.004269, 0.004269]
    },
    safari: {
      prefix: "-webkit-",
      future: [7],
      versions: [6, 5.1, 5, 4, 3.2, 3.1],
      popularity: [1.91251, 1.25509, 0.401286, 0.110994, 0.008692, 0]
    }
  };

}).call(this);

});
require.register("autoprefixer/data/prefixes.js", function(exports, require, module){
(function() {
  module.exports = {
    "@keyframes": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "align-content": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "align-items": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "align-self": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    animation: {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-delay": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-direction": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-duration": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-fill-mode": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-iteration-count": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-name": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-play-state": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "animation-timing-function": {
      browsers: ["ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "backface-visibility": {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "border-bottom-left-radius": {
      browsers: ["ff 2", "ff 3", "ff 3.5", "ff 3.6", "chrome 4", "safari 4", "safari 3.1", "safari 3.2", "ios 3.2", "android 2.1"],
      transition: true
    },
    "border-bottom-right-radius": {
      browsers: ["ff 2", "ff 3", "ff 3.5", "ff 3.6", "chrome 4", "safari 4", "safari 3.1", "safari 3.2", "ios 3.2", "android 2.1"],
      transition: true
    },
    "border-radius": {
      browsers: ["ff 2", "ff 3", "ff 3.5", "ff 3.6", "chrome 4", "safari 4", "safari 3.1", "safari 3.2", "ios 3.2", "android 2.1"],
      transition: true
    },
    "border-top-left-radius": {
      browsers: ["ff 2", "ff 3", "ff 3.5", "ff 3.6", "chrome 4", "safari 4", "safari 3.1", "safari 3.2", "ios 3.2", "android 2.1"],
      transition: true
    },
    "border-top-right-radius": {
      browsers: ["ff 2", "ff 3", "ff 3.5", "ff 3.6", "chrome 4", "safari 4", "safari 3.1", "safari 3.2", "ios 3.2", "android 2.1"],
      transition: true
    },
    "box-shadow": {
      browsers: ["ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "safari 4", "safari 5", "safari 3.1", "safari 3.2", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "android 3", "android 2.1", "android 2.2", "android 2.3", "bb 7"],
      transition: true
    },
    "box-sizing": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "safari 4", "safari 5", "safari 3.1", "safari 3.2", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "android 3", "android 2.1", "android 2.2", "android 2.3", "bb 7"]
    },
    "break-after": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "break-before": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "break-inside": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    calc: {
      props: ["*"],
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 6", "ios 6", "ios 6.1", "bb 10"]
    },
    "column-count": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-fill": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-gap": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-rule": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-rule-color": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-rule-style": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-rule-width": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-span": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "column-width": {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    columns: {
      browsers: ["ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    filter: {
      browsers: ["chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 6", "safari 7", "opera 15", "ios 6", "ios 6.1", "ios 7", "bb 10"],
      transition: true
    },
    flex: {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-basis": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-direction": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-flow": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-grow": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-shrink": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "flex-wrap": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "inline-flex": {
      props: ["display"],
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "justify-content": {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "linear-gradient": {
      props: ["background", "background-image"],
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    order: {
      browsers: ["ie 10", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    perspective: {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "perspective-origin": {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "radial-gradient": {
      props: ["background", "background-image"],
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "repeating-linear-gradient": {
      props: ["background", "background-image"],
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "repeating-radial-gradient": {
      props: ["background", "background-image"],
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 7", "safari 5.1", "opera 12", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    transform: {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "transform-origin": {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    "transform-style": {
      browsers: ["ie 9", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 3.5", "ff 3.6", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 15", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"],
      transition: true
    },
    transition: {
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "transition-delay": {
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "transition-duration": {
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "transition-property": {
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "transition-timing-function": {
      browsers: ["ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "chrome 4", "chrome 5", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "safari 4", "safari 5", "safari 6", "safari 3.1", "safari 3.2", "safari 5.1", "opera 11", "opera 12", "opera 10.5", "opera 10.6", "opera 11.1", "opera 11.5", "opera 11.6", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    },
    "user-select": {
      browsers: ["ie 10", "ie 11", "ff 2", "ff 3", "ff 4", "ff 5", "ff 6", "ff 7", "ff 8", "ff 9", "ff 10", "ff 11", "ff 12", "ff 13", "ff 14", "ff 15", "ff 16", "ff 17", "ff 18", "ff 19", "ff 20", "ff 21", "ff 22", "ff 23", "ff 3.5", "ff 3.6", "chrome 6", "chrome 7", "chrome 8", "chrome 9", "chrome 10", "chrome 11", "chrome 12", "chrome 13", "chrome 14", "chrome 15", "chrome 16", "chrome 17", "chrome 18", "chrome 19", "chrome 20", "chrome 21", "chrome 22", "chrome 23", "chrome 24", "chrome 25", "chrome 26", "chrome 27", "chrome 28", "chrome 29", "safari 4", "safari 5", "safari 6", "safari 7", "safari 3.1", "safari 3.2", "safari 5.1", "opera 15", "ios 3.2", "ios 4", "ios 4.1", "ios 4.2", "ios 4.3", "ios 5", "ios 5.1", "ios 6", "ios 6.1", "ios 7", "android 3", "android 4", "android 2.1", "android 2.2", "android 2.3", "android 4.1", "android 4.2", "bb 7", "bb 10"]
    }
  };

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer.js", function(exports, require, module){
(function() {
  var Browsers, CSS, Prefixes, autoprefixer, parse, stringify;

  parse = require('css-parse');

  stringify = require('css-stringify');

  Browsers = require('./autoprefixer/browsers');

  Prefixes = require('./autoprefixer/prefixes');

  CSS = require('./autoprefixer/css');

  autoprefixer = {
    compile: function(str, requirements) {
      var nodes,
        _this = this;
      nodes = this.catchParseErrors(function() {
        return parse(_this.removeBadComments(str));
      });
      this.rework(requirements)(nodes.stylesheet);
      return this.catchParseErrors(function() {
        return stringify(nodes);
      });
    },
    rework: function(requirements) {
      var browsers, prefixes;
      browsers = new Browsers(this.data.browsers, requirements);
      prefixes = new Prefixes(this.data.prefixes, browsers);
      return function(stylesheet) {
        var css;
        css = new CSS(stylesheet);
        prefixes.processor.add(css);
        return prefixes.processor.remove(css);
      };
    },
    data: {
      browsers: require('../data/browsers'),
      prefixes: require('../data/prefixes')
    },
    removeBadComments: function(css) {
      return css.replace(/\/\*[^\*]*\*\/\s*:/g, ':').replace(/\/\*[^\*]*\{[^\*]*\*\//g, '');
    },
    inspect: function(requirements) {
      var browsers, prefixes;
      browsers = new Browsers(this.data.browsers, requirements);
      prefixes = new Prefixes(this.data.prefixes, browsers);
      this.inspectFunc || (this.inspectFunc = require('./autoprefixer/inspect'));
      return this.inspectFunc(prefixes);
    },
    catchParseErrors: function(callback) {
      var e, error;
      try {
        return callback();
      } catch (_error) {
        e = _error;
        error = new Error("Can't parse CSS");
        error.stack = e.stack;
        error.css = true;
        throw error;
      }
    }
  };

  module.exports = autoprefixer;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/binary.js", function(exports, require, module){
(function() {
  var Binary, autoprefixer, fs;

  autoprefixer = require('../autoprefixer');

  fs = require('fs');

  Binary = (function() {
    function Binary(process) {
      this["arguments"] = process.argv.slice(2);
      this.stdin = process.stdin;
      this.stderr = process.stderr;
      this.stdout = process.stdout;
      this.status = 0;
      this.command = 'compile';
      this.inputFiles = [];
      this.parseArguments();
    }

    Binary.prototype.help = function() {
      var h;
      h = [];
      h.push('Usage: autoprefixer [OPTION...] FILES');
      h.push('');
      h.push('Parse CSS files and add prefixed properties and values.');
      h.push('');
      h.push('Options:');
      h.push('  -b, --browsers BROWSERS  add prefixes for selected browsers');
      h.push('  -o, --output FILE        set output CSS file');
      h.push('  -i, --inspect            show selected browsers and properties');
      h.push('  -h, --help               show help text');
      h.push('  -v, --version            print program version');
      return h.join("\n");
    };

    Binary.prototype.desc = function() {
      var h;
      h = [];
      h.push('Files:');
      h.push("  Be default, prefixed CSS will rewrite original files.");
      h.push("  If you didn't set input files, " + "autoprefixer will read from stdin stream.");
      h.push("  Output CSS will be written to stdout stream on " + "`-o -' argument or stdin input.");
      h.push('');
      h.push('Browsers:');
      h.push('  Separate browsers by comma. For example, ' + "`-b \"> 1%, opera 12\".");
      h.push("  You can set browsers by global usage statictics: " + "`-b \"> 1%\"'");
      h.push("  or last version: `-b \"last 2 versions\"' (by default).");
      return h.join("\n");
    };

    Binary.prototype.print = function(str) {
      str = str.replace(/\n$/, '');
      return this.stdout.write(str + "\n");
    };

    Binary.prototype.error = function(str) {
      this.status = 1;
      return this.stderr.write(str + "\n");
    };

    Binary.prototype.version = function() {
      return require('../../package.json').version;
    };

    Binary.prototype.parseArguments = function() {
      var arg, args, _results;
      args = this["arguments"].slice();
      _results = [];
      while (args.length > 0) {
        arg = args.shift();
        if (arg === '-h' || arg === '--help') {
          _results.push(this.command = 'showHelp');
        } else if (arg === '-v' || arg === '--version') {
          _results.push(this.command = 'showVersion');
        } else if (arg === '-i' || arg === '--inspect') {
          _results.push(this.command = 'inspect');
        } else if (arg === '-b' || arg === '--browsers') {
          _results.push(this.requirements = args.shift().split(',').map(function(i) {
            return i.trim();
          }));
        } else if (arg === '-o' || arg === '--output') {
          _results.push(this.outputFile = args.shift());
        } else if (arg.match(/^-\w$/) || arg.match(/^--\w[\w-]+$/)) {
          this.command = void 0;
          this.error("autoprefixer: Unknown argument " + arg);
          this.error('');
          _results.push(this.error(this.help()));
        } else {
          _results.push(this.inputFiles.push(arg));
        }
      }
      return _results;
    };

    Binary.prototype.showHelp = function(done) {
      this.print(this.help());
      this.print('');
      this.print(this.desc());
      return done();
    };

    Binary.prototype.showVersion = function(done) {
      this.print("autoprefixer " + (this.version()));
      return done();
    };

    Binary.prototype.inspect = function(done) {
      this.print(autoprefixer.inspect(this.requirements));
      return done();
    };

    Binary.prototype.startWork = function() {
      return this.waiting += 1;
    };

    Binary.prototype.endWork = function() {
      this.waiting -= 1;
      if (this.waiting <= 0) {
        return this.doneCallback();
      }
    };

    Binary.prototype.compileCSS = function(css, file) {
      var error, prefixed,
        _this = this;
      try {
        prefixed = autoprefixer.compile(css, this.requirements);
      } catch (_error) {
        error = _error;
        if (error.autoprefixer || error.css) {
          this.error("autoprefixer: " + error.message);
        } else {
          this.error('autoprefixer: Internal error');
        }
        if (error.css || !error.autoprefixer) {
          if (error.stack != null) {
            this.error('');
            this.error(error.stack);
          }
        }
      }
      if (!prefixed) {
        return this.endWork();
      }
      if (file === '-') {
        this.print(prefixed);
        return this.endWork();
      } else {
        return fs.writeFile(file, prefixed, function(error) {
          if (error) {
            _this.error("autoprefixer: " + error);
          }
          return _this.endWork();
        });
      }
    };

    Binary.prototype.compile = function(done) {
      var css, file, _fn, _i, _len, _ref,
        _this = this;
      this.waiting = 0;
      this.doneCallback = done;
      if (this.inputFiles.length === 0) {
        this.startWork();
        this.outputFile || (this.outputFile = '-');
        css = '';
        this.stdin.resume();
        this.stdin.on('data', function(chunk) {
          return css += chunk;
        });
        return this.stdin.on('end', function() {
          return _this.compileCSS(css, _this.outputFile);
        });
      } else {
        fs = require('fs');
        _ref = this.inputFiles;
        _fn = function(file) {
          return fs.readFile(file, function(error, css) {
            if (error) {
              return _this.error("autoprefixer: " + error);
            } else {
              css = css.toString();
              return _this.compileCSS(css, _this.outputFile || file);
            }
          });
        };
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          file = _ref[_i];
          this.startWork();
          if (!fs.existsSync(file)) {
            this.error("autoprefixer: File " + file + " doesn't exists");
            this.endWork();
            return;
          }
          _fn(file);
        }
      }
    };

    Binary.prototype.run = function(done) {
      if (this.command) {
        return this[this.command](done);
      } else {
        return done();
      }
    };

    return Binary;

  })();

  module.exports = Binary;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/browsers.js", function(exports, require, module){
(function() {
  var Browsers, utils;

  utils = require('./utils');

  Browsers = (function() {
    function Browsers(data, requirements) {
      this.data = data;
      this.selected = this.parse(requirements);
    }

    Browsers.prototype.parse = function(requirements) {
      var selected,
        _this = this;
      if (requirements == null) {
        requirements = ['last 2 versions'];
      }
      if (!(requirements instanceof Array)) {
        requirements = [requirements];
      }
      selected = [];
      requirements.map(function(req) {
        var i, match, name, _ref;
        _ref = _this.requirements;
        for (name in _ref) {
          i = _ref[name];
          if (match = req.match(i.regexp)) {
            selected = selected.concat(i.select.apply(_this, match.slice(1)));
            return;
          }
        }
        return utils.error("Unknown browser requirement `" + req + "`");
      });
      return utils.uniq(selected);
    };

    Browsers.prototype.requirements = {
      lastVersions: {
        regexp: /^last (\d+) versions?$/i,
        select: function(versions) {
          return this.browsers(function(data) {
            return data.versions.slice(0, versions);
          });
        }
      },
      globalStatistics: {
        regexp: /^> (\d+(\.\d+)?)%$/,
        select: function(popularity) {
          return this.browsers(function(data) {
            return data.versions.filter(function(version, i) {
              return data.popularity[i] > popularity;
            });
          });
        }
      },
      direct: {
        regexp: /^(\w+) ([\d\.]+)$/,
        select: function(browser, version) {
          var data, first, last;
          data = this.data[browser];
          version = parseFloat(version);
          if (!data) {
            utils.error("Unknown browser " + browser);
          }
          last = data.future ? data.future[0] : data.versions[0];
          first = data.versions[data.versions.length - 1];
          if (version > last) {
            version = last;
          } else if (version < first) {
            version = first;
          }
          return ["" + browser + " " + version];
        }
      }
    };

    Browsers.prototype.browsers = function(criteria) {
      var browser, data, selected, versions, _ref;
      selected = [];
      _ref = this.data;
      for (browser in _ref) {
        data = _ref[browser];
        if (data.minor) {
          continue;
        }
        versions = criteria(data).map(function(version) {
          return "" + browser + " " + version;
        });
        selected = selected.concat(versions);
      }
      return selected;
    };

    Browsers.prototype.prefixes = function() {
      var i, name;
      return this.prefixesCache || (this.prefixesCache = utils.uniq((function() {
        var _ref, _results;
        _ref = this.data;
        _results = [];
        for (name in _ref) {
          i = _ref[name];
          _results.push(i.prefix);
        }
        return _results;
      }).call(this)).sort(function(a, b) {
        return b.length - a.length;
      }));
    };

    Browsers.prototype.prefix = function(browser) {
      var name;
      name = browser.split(' ')[0];
      return this.data[name].prefix;
    };

    Browsers.prototype.isSelected = function(browser) {
      return this.selected.indexOf(browser) !== -1;
    };

    return Browsers;

  })();

  module.exports = Browsers;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/css.js", function(exports, require, module){
(function() {
  var CSS, Declaration, Keyframes, Rule;

  Rule = require('./rule');

  Keyframes = require('./keyframes');

  Declaration = require('./declaration');

  CSS = (function() {
    function CSS(stylesheet) {
      this.stylesheet = stylesheet;
    }

    CSS.prototype.eachKeyframes = function(callback) {
      var rule, _results;
      this.number = 0;
      _results = [];
      while (this.number < this.stylesheet.rules.length) {
        rule = this.stylesheet.rules[this.number];
        if (rule.keyframes) {
          callback(new Keyframes(this, this.number, rule));
        }
        _results.push(this.number += 1);
      }
      return _results;
    };

    CSS.prototype.containKeyframes = function(rule) {
      return this.stylesheet.rules.some(function(i) {
        return i.keyframes && i.name === rule.name && i.vendor === rule.vendor;
      });
    };

    CSS.prototype.addKeyframes = function(position, rule) {
      if (this.containKeyframes(rule)) {
        return;
      }
      this.stylesheet.rules.splice(position, 0, rule);
      return this.number += 1;
    };

    CSS.prototype.removeKeyframes = function(position) {
      this.stylesheet.rules.splice(position, 1);
      return this.number -= 1;
    };

    CSS.prototype.eachDeclaration = function(callback, node) {
      var i, keyframe, rule, _i, _j, _len, _len1, _ref, _ref1, _results;
      if (node == null) {
        node = this.stylesheet;
      }
      _ref = node.rules;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        if (i.rules) {
          this.eachDeclaration(callback, i);
        }
        if (i.keyframes) {
          _ref1 = i.keyframes;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            keyframe = _ref1[_j];
            rule = new Rule(keyframe.declarations, i.vendor);
            rule.each(callback);
          }
        }
        if (i.declarations) {
          rule = new Rule(i.declarations, i.vendor);
          _results.push(rule.each(callback));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return CSS;

  })();

  module.exports = CSS;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/declaration.js", function(exports, require, module){
(function() {
  var Declaration, utils;

  utils = require('./utils');

  Declaration = (function() {
    function Declaration(rule, number, node) {
      var separator;
      this.rule = rule;
      this.number = number;
      this.node = node;
      this.prop = this.node.property;
      this.value = this.node.value;
      if (this.prop[0] === '-') {
        separator = this.prop.indexOf('-', 1) + 1;
        this.prefix = this.prop.slice(0, separator);
        this.unprefixed = this.prop.slice(separator);
      } else {
        this.unprefixed = this.prop;
      }
      this.valuesCache = {};
    }

    Declaration.prototype.valueContain = function(strings) {
      var _this = this;
      return strings.some(function(i) {
        return _this.value.indexOf(i) !== -1;
      });
    };

    Declaration.prototype.prefixProp = function(prefix) {
      if (this.rule.contain(prefix + this.unprefixed)) {
        return;
      }
      return this.insertBefore(prefix + this.unprefixed, this.value);
    };

    Declaration.prototype.insertBefore = function(prop, value) {
      var clone;
      if (this.rule.contain(prop, value)) {
        return;
      }
      clone = utils.clone(this.node, {
        property: prop,
        value: value
      });
      this.rule.add(this.number, clone);
      return this.number += 1;
    };

    Declaration.prototype.remove = function() {
      return this.rule.remove(this.number);
    };

    Declaration.prototype.prefixValue = function(prefix, value) {
      var val;
      val = this.valuesCache[prefix] || this.value;
      return this.valuesCache[prefix] = value.addPrefix(prefix, val);
    };

    Declaration.prototype.setValue = function(value) {
      return this.value = this.node.value = value;
    };

    Declaration.prototype.saveValues = function() {
      var prefix, prefixed, value, _ref, _results;
      _ref = this.valuesCache;
      _results = [];
      for (prefix in _ref) {
        value = _ref[prefix];
        if (this.rule.prefix && prefix !== this.rule.prefix) {
          continue;
        }
        if (prefixed = this.rule.byProp(prefix + this.unprefixed)) {
          _results.push(prefixed.setValue(value));
        } else {
          _results.push(this.insertBefore(this.prop, value));
        }
      }
      return _results;
    };

    return Declaration;

  })();

  module.exports = Declaration;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/hacks/gradient.js", function(exports, require, module){
(function() {
  var Gradient, Value, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Value = require('../value');

  utils = require('../utils');

  Gradient = (function(_super) {
    __extends(Gradient, _super);

    function Gradient(name, prefixes) {
      this.name = name;
      this.prefixes = prefixes;
      name = utils.escapeRegexp(this.name);
      this.regexp = new RegExp('(^|\\s|,)' + name + '\\(([^)]+)\\)', 'gi');
    }

    Gradient.prototype.addPrefix = function(prefix, string) {
      var _this = this;
      return string.replace(this.regexp, function(all, before, params) {
        params = params.trim().split(/\s*,\s*/);
        if (params.length > 0) {
          if (params[0].slice(0, 3) === 'to ') {
            params[0] = _this.fixDirection(params[0]);
          } else if (prefix === '-webkit-' && params[0].match(/^-?\d+deg/)) {
            params[0] = _this.fixAngle(params[0]);
          }
        }
        return before + prefix + _this.name + '(' + params.join(', ') + ')';
      });
    };

    Gradient.prototype.directions = {
      top: 'bottom',
      left: 'right',
      bottom: 'top',
      right: 'left'
    };

    Gradient.prototype.fixDirection = function(param) {
      var value;
      param = param.split(' ');
      param.splice(0, 1);
      param = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = param.length; _i < _len; _i++) {
          value = param[_i];
          _results.push(this.directions[value.toLowerCase()] || value);
        }
        return _results;
      }).call(this);
      return param.join(' ');
    };

    Gradient.prototype.fixAngle = function(param) {
      param = parseInt(param);
      param += 90;
      if (param > 360) {
        param -= 360;
      }
      return "" + param + "deg";
    };

    Gradient.prototype.prefixed = function(prefix) {
      var type;
      if (prefix === '-webkit-') {
        type = this.name === 'linear-gradient' ? 'linear' : 'radial';
        return utils.regexp("-webkit-(" + type + "-gradient|gradient\\(\\s*" + type + ")", false);
      } else {
        return Gradient.__super__.prefixed.apply(this, arguments);
      }
    };

    return Gradient;

  })(Value);

  module.exports = Gradient;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/inspect.js", function(exports, require, module){
(function() {
  var capitalize, names, prefix;

  capitalize = function(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
  };

  names = {
    ie: 'IE',
    ff: 'Firefox',
    ios: 'iOS'
  };

  prefix = function(name, transition, prefixes) {
    var out;
    out = '  ' + name + (transition ? '*' : '') + ': ';
    out += prefixes.map(function(i) {
      return i.replace(/^-(.*)-$/g, '$1');
    }).join(', ');
    out += "\n";
    return out;
  };

  module.exports = function(prefixes) {
    var browser, data, list, name, needTransition, out, props, string, transitionProp, useTransition, value, values, version, versions, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4;
    if (prefixes.browsers.selected.length === 0) {
      return "No browsers selected";
    }
    versions = [];
    _ref = prefixes.browsers.selected;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      browser = _ref[_i];
      _ref1 = browser.split(' '), name = _ref1[0], version = _ref1[1];
      name = names[name] || capitalize(name);
      if (versions[name]) {
        versions[name].push(version);
      } else {
        versions[name] = [version];
      }
    }
    out = "Browsers:\n";
    for (browser in versions) {
      list = versions[browser];
      out += '  ' + browser + ': ' + list.join(', ') + "\n";
    }
    values = '';
    props = '';
    useTransition = false;
    needTransition = (_ref2 = prefixes.add.transition) != null ? _ref2.prefixes : void 0;
    _ref3 = prefixes.add;
    for (name in _ref3) {
      data = _ref3[name];
      if (data.prefixes) {
        transitionProp = needTransition && prefixes.data[name].transition;
        if (transitionProp) {
          useTransition = true;
        }
        props += prefix(name, transitionProp, data.prefixes);
      }
      if (!data.values) {
        continue;
      }
      if (prefixes.transitionProps.some(function(i) {
        return i === name;
      })) {
        continue;
      }
      _ref4 = data.values;
      for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
        value = _ref4[_j];
        string = prefix(value.name, false, value.prefixes);
        if (values.indexOf(string) === -1) {
          values += string;
        }
      }
    }
    if (useTransition) {
      props += "  * - can be used in transition\n";
    }
    if (props !== '') {
      out += "\nProperties:\n" + props;
    }
    if (values !== '') {
      out += "\nValues:\n" + values;
    }
    return out;
  };

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/keyframes.js", function(exports, require, module){
(function() {
  var Keyframes, utils;

  utils = require('./utils');

  Keyframes = (function() {
    function Keyframes(css, number, rule) {
      this.css = css;
      this.number = number;
      this.rule = rule;
      this.prefix = this.rule.vendor;
    }

    Keyframes.prototype.clone = function() {
      return utils.clone(this.rule, {
        keyframes: this.rule.keyframes.map(function(i) {
          return utils.clone(i, {
            values: i.values.slice(),
            declarations: i.declarations.map(function(decl) {
              return utils.clone(decl);
            })
          });
        })
      });
    };

    Keyframes.prototype.cloneWithPrefix = function(prefix) {
      var clone;
      clone = this.clone();
      clone.vendor = prefix;
      this.css.addKeyframes(this.number, clone);
      return this.number += 1;
    };

    Keyframes.prototype.remove = function() {
      return this.css.removeKeyframes(this.number);
    };

    return Keyframes;

  })();

  module.exports = Keyframes;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/prefixes.js", function(exports, require, module){
(function() {
  var Prefixes, Processor, Value, utils;

  utils = require('./utils');

  Processor = require('./processor');

  Value = require('./value');

  Value.register('linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient', require('./hacks/gradient'));

  Prefixes = (function() {
    function Prefixes(data, browsers) {
      var _ref;
      this.data = data;
      this.browsers = browsers;
      _ref = this.preprocess(this.select(this.data)), this.add = _ref[0], this.remove = _ref[1];
      this.otherCache = {};
      this.processor = new Processor(this);
    }

    Prefixes.prototype.transitionProps = ['transition', 'transition-property'];

    Prefixes.prototype.select = function(list) {
      var add, all, data, name, selected,
        _this = this;
      selected = {
        add: {},
        remove: {}
      };
      for (name in list) {
        data = list[name];
        add = data.browsers.filter(function(i) {
          return _this.browsers.isSelected(i);
        }).map(function(i) {
          return _this.browsers.prefix(i);
        }).sort(function(a, b) {
          return b.length - a.length;
        });
        all = utils.uniq(data.browsers.map(function(i) {
          return _this.browsers.prefix(i);
        }));
        if (add.length) {
          add = utils.uniq(add);
          selected.add[name] = add;
          if (add.length < all.length) {
            selected.remove[name] = all.filter(function(i) {
              return add.indexOf(i) === -1;
            });
          }
        } else {
          selected.remove[name] = all;
        }
      }
      return selected;
    };

    Prefixes.prototype.preprocess = function(selected) {
      var add, name, prefix, prefixed, prefixes, prop, props, regexp, remove, value, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1;
      add = {};
      _ref = selected.add;
      for (name in _ref) {
        prefixes = _ref[name];
        props = this.data[name].transition ? this.transitionProps : this.data[name].props;
        if (props) {
          value = Value.load(name, prefixes);
          for (_i = 0, _len = props.length; _i < _len; _i++) {
            prop = props[_i];
            if (!add[prop]) {
              add[prop] = {};
            }
            if (!add[prop].values) {
              add[prop].values = [];
            }
            add[prop].values.push(value);
          }
        }
        if (!this.data[name].props) {
          if (!add[name]) {
            add[name] = {};
          }
          add[name].prefixes = prefixes;
        }
      }
      remove = {};
      _ref1 = selected.remove;
      for (name in _ref1) {
        prefixes = _ref1[name];
        props = this.data[name].transition ? this.transitionProps : this.data[name].props;
        if (props) {
          value = Value.load(name);
          for (_j = 0, _len1 = prefixes.length; _j < _len1; _j++) {
            prefix = prefixes[_j];
            regexp = value.prefixed(prefix);
            for (_k = 0, _len2 = props.length; _k < _len2; _k++) {
              prop = props[_k];
              if (!remove[prop]) {
                remove[prop] = {};
              }
              if (!remove[prop].values) {
                remove[prop].values = [];
              }
              remove[prop].values.push(regexp);
            }
          }
        }
        if (!this.data[name].props) {
          for (_l = 0, _len3 = prefixes.length; _l < _len3; _l++) {
            prefix = prefixes[_l];
            prefixed = prefix + name;
            if (!remove[prefixed]) {
              remove[prefixed] = {};
            }
            remove[prefixed].remove = true;
          }
        }
      }
      return [add, remove];
    };

    Prefixes.prototype.other = function(prefix) {
      var _base;
      return (_base = this.otherCache)[prefix] || (_base[prefix] = this.browsers.prefixes().filter(function(i) {
        return i !== prefix;
      }));
    };

    Prefixes.prototype.each = function(prop, callback) {
      var prefix, _i, _len, _ref, _results;
      if (this.add[prop] && this.add[prop].prefixes) {
        _ref = this.add[prop].prefixes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          prefix = _ref[_i];
          _results.push(callback(prefix));
        }
        return _results;
      }
    };

    Prefixes.prototype.values = function(type, prop) {
      var data, values, _ref, _ref1;
      data = this[type];
      values = ((_ref = data['*']) != null ? _ref.values : void 0) || [];
      if ((_ref1 = data[prop]) != null ? _ref1.values : void 0) {
        values = values.concat(data[prop].values);
      }
      return utils.uniq(values);
    };

    Prefixes.prototype.toRemove = function(prop) {
      var _ref;
      return (_ref = this.remove[prop]) != null ? _ref.remove : void 0;
    };

    return Prefixes;

  })();

  module.exports = Prefixes;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/processor.js", function(exports, require, module){
(function() {
  var Processor;

  Processor = (function() {
    function Processor(prefixes) {
      this.prefixes = prefixes;
    }

    Processor.prototype.add = function(css) {
      var _this = this;
      css.eachKeyframes(function(keyframes) {
        if (keyframes.prefix) {
          return;
        }
        return _this.prefixes.each('@keyframes', function(prefix) {
          return keyframes.cloneWithPrefix(prefix);
        });
      });
      css.eachDeclaration(function(decl, vendor) {
        return _this.prefixes.each(decl.prop, function(prefix) {
          if (vendor && vendor !== prefix) {
            return;
          }
          if (decl.valueContain(_this.prefixes.other(prefix))) {
            return;
          }
          return decl.prefixProp(prefix);
        });
      });
      return css.eachDeclaration(function(decl, vendor) {
        var prefix, value, _i, _j, _len, _len1, _ref, _ref1;
        _ref = _this.prefixes.values('add', decl.unprefixed);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          if (!value.check(decl)) {
            continue;
          }
          _ref1 = value.prefixes;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            prefix = _ref1[_j];
            if (vendor && vendor !== prefix) {
              continue;
            }
            decl.prefixValue(prefix, value);
          }
        }
        return decl.saveValues();
      });
    };

    Processor.prototype.remove = function(css) {
      var _this = this;
      css.eachKeyframes(function(keyframes) {
        if (_this.prefixes.toRemove(keyframes.prefix + '@keyframes')) {
          return keyframes.remove();
        }
      });
      return css.eachDeclaration(function(decl, vendor) {
        var value, _i, _len, _ref;
        if (_this.prefixes.toRemove(decl.prop)) {
          decl.remove();
          return;
        }
        _ref = _this.prefixes.values('remove', decl.unprefixed);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          if (decl.value.match(value)) {
            decl.remove();
            return;
          }
        }
      });
    };

    return Processor;

  })();

  module.exports = Processor;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/rule.js", function(exports, require, module){
(function() {
  var Declaration, Rule;

  Declaration = require('./declaration');

  Rule = (function() {
    function Rule(declarations, prefix) {
      this.declarations = declarations;
      this.prefix = prefix;
    }

    Rule.prototype.each = function(callback) {
      var decl, _results;
      this.number = 0;
      _results = [];
      while (this.number < this.declarations.length) {
        if (this.declarations[this.number].property) {
          decl = new Declaration(this, this.number, this.declarations[this.number]);
          callback(decl, decl.prefix || this.prefix);
        }
        _results.push(this.number += 1);
      }
      return _results;
    };

    Rule.prototype.contain = function(prop, value) {
      if (value != null) {
        return this.declarations.some(function(i) {
          return i.property === prop && i.value === value;
        });
      } else {
        return this.declarations.some(function(i) {
          return i.property === prop;
        });
      }
    };

    Rule.prototype.add = function(position, decl) {
      this.declarations.splice(position, 0, decl);
      return this.number += 1;
    };

    Rule.prototype.byProp = function(prop) {
      var decl, i, _i, _len, _ref;
      _ref = this.declarations;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        decl = _ref[i];
        if (decl.property === prop) {
          return new Declaration(this, i, decl);
        }
      }
      return null;
    };

    Rule.prototype.remove = function(position) {
      this.declarations.splice(this.number, 1);
      return this.number -= 1;
    };

    return Rule;

  })();

  module.exports = Rule;

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/utils.js", function(exports, require, module){
(function() {
  module.exports = {
    error: function(text) {
      var err;
      err = new Error(text);
      err.autoprefixer = true;
      throw err;
    },
    uniq: function(array) {
      var filtered, i, _i, _len;
      filtered = [];
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        i = array[_i];
        if (filtered.indexOf(i) === -1) {
          filtered.push(i);
        }
      }
      return filtered;
    },
    clone: function(obj, changes) {
      var clone, key, value;
      if (changes == null) {
        changes = {};
      }
      clone = {};
      for (key in obj) {
        value = obj[key];
        if (!changes[key]) {
          clone[key] = value;
        }
      }
      for (key in changes) {
        value = changes[key];
        clone[key] = value;
      }
      return clone;
    },
    escapeRegexp: function(string) {
      return string.replace(/([.?*+\^\$\[\]\\(){}|\-])/g, "\\$1");
    },
    regexp: function(word, escape) {
      if (escape == null) {
        escape = true;
      }
      if (escape) {
        word = this.escapeRegexp(word);
      }
      return new RegExp('(^|\\s|,|\\()(' + word + '($|\\s|\\(|,))', 'gi');
    }
  };

}).call(this);

});
require.register("autoprefixer/lib/autoprefixer/value.js", function(exports, require, module){
(function() {
  var Value, utils,
    __slice = [].slice;

  utils = require('./utils');

  Value = (function() {
    Value.register = function() {
      var klass, name, names, _i, _j, _len, _results;
      names = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), klass = arguments[_i++];
      _results = [];
      for (_j = 0, _len = names.length; _j < _len; _j++) {
        name = names[_j];
        _results.push(this.hacks[name] = klass);
      }
      return _results;
    };

    Value.hacks = {};

    Value.load = function(name, prefixes) {
      var klass;
      klass = this.hacks[name] || Value;
      return new klass(name, prefixes);
    };

    function Value(name, prefixes) {
      this.name = name;
      this.prefixes = prefixes;
      this.regexp = utils.regexp(this.name);
    }

    Value.prototype.check = function(decl) {
      return !!decl.value.match(this.regexp);
    };

    Value.prototype.prefixed = function(prefix) {
      return utils.regexp(prefix + this.name);
    };

    Value.prototype.addPrefix = function(prefix, string) {
      return string.replace(this.regexp, '$1' + prefix + '$2');
    };

    return Value;

  })();

  module.exports = Value;

}).call(this);

});
require.alias("visionmedia-css-parse/index.js", "autoprefixer/deps/css-parse/index.js");
require.alias("visionmedia-css-parse/index.js", "css-parse/index.js");

require.alias("visionmedia-css-stringify/index.js", "autoprefixer/deps/css-stringify/index.js");
require.alias("visionmedia-css-stringify/lib/compress.js", "autoprefixer/deps/css-stringify/lib/compress.js");
require.alias("visionmedia-css-stringify/lib/identity.js", "autoprefixer/deps/css-stringify/lib/identity.js");
require.alias("visionmedia-css-stringify/index.js", "css-stringify/index.js");

require.alias("autoprefixer/lib/autoprefixer.js", "autoprefixer/index.js");

if (typeof exports == "object") {
  module.exports = require("autoprefixer");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("autoprefixer"); });
} else {
  this["autoprefixer"] = require("autoprefixer");
}})();