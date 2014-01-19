
var transform = require('react-tools').transform;
var utils = require('./utils');


var tagExpr = /^\s*(if|else if|elseif|else|end|name|for|jsx)(?:\s(.*))?\s*$/;

var ROOT_HEADER = "/** @jsx React.DOM */\n"+
    "(function (root, factory) {\n"+
    "  if (typeof define === 'function' && define.amd) {\n"+
    "    // AMD. Register as an anonymous module.\n"+
    "    define(['exports', '"+utils.libName+"'], factory);\n"+
    "  } else if (typeof exports === 'object') {\n"+
    "    // CommonJS\n"+
    "    factory(exports);\n"+
    "  } else {\n"+
    "    // Browser globals\n"+
    "    factory((root.%name% = {}), root."+utils.libName+");\n"+
    "  }\n"+
    "}(this, function (exports, "+utils.libName+") {\n"+
    ""+utils.libName+".template(function(ctx){\n"+
    "  return (";

var ROOT_FOOTER = ");\n}, exports);}));";

var IF_HEADER = "{(function(){\n" +
      "if (%condition%){\n" +
      "return (";
var IF_FOOTER = "\n);\n}\n})()}";
var ELSEIF_HEADER = ");\n} else if (%condition%) {\n" +
      "return (";

var ELSE_HEADER = ");\n} else {\n" +
      "return (";

var FOR_HEADER = "{Array.prototype.map.call(%source%, function(%variable%) {\n" +
    "  return (";
var FOR_FOOTER = ");\n})}";

var JSX_HEADER = "{(function(){\n";
var JSX_FOOTER = "\n})()}";


function extend(src, dest) {
  dest = dest || {};
  for (var i in src) {
    dest[i] = src[i];
  }
  return dest;
}

function Node() {
  this.tagName = 'generic';
  this.parent = null;
  this.children = [];
}

Node.prototype.getHeader = function() { return ''; }
Node.prototype.getFooter = function() { return ''; }

Node.prototype.accepted = ['if','for', 'jsx'];
Node.prototype.onNext = function(node) {

  if (this.accepted.indexOf(node.tagName) === -1)
    throw new Error("unexpected "+node.tagName+" after "+this.tagName);

  this.children.push(node);
  node.parent = this;

  return node;
};

Node.prototype.onContent = function(content) {
  this.children.push(content);
};

Node.prototype.render = function() {
  var ret = this.getHeader();

  for (var i in this.children) {
    var el = this.children[i];
    if (typeof el === 'string') {
      ret += el;
    } else {
      ret += el.render();
    }
  }

  return ret + this.getFooter();
};

function Root() {
  Node.apply(this, arguments);
  this.tpl_name = 'default_template';
}
extend(Node.prototype, Root.prototype);

Root.prototype.getHeader = function() {
  return ROOT_HEADER.replace('%name%', this.tpl_name);
};

Root.prototype.getFooter = function() {
  return ROOT_FOOTER;
};

function If(condition) {
  Node.apply(this, arguments);
  this.tagName = this.closingTag = 'if';
  this.condition = condition;
}
extend(Node.prototype, If.prototype);

If.prototype.accepted = If.prototype.accepted.concat(['else', 'elseif']);

If.prototype.getHeader = function() {
  return IF_HEADER.replace('%condition%', this.condition);
};

If.prototype.getFooter = function() {
  return IF_FOOTER;
};

If.prototype.onNext = function(node) {
  if (node.tagName == 'elseif' || node.tagName == 'else') {
    node.parent = this.parent;
    this.children.push(node);
  } else {
    Node.prototype.onNext.apply(this, arguments);
  }
  return node;
};

function ElseIf() {
  If.apply(this, arguments);
  this.tagName = 'elseif';
}
extend(If.prototype, ElseIf.prototype);

ElseIf.prototype.getFooter = function() { return ''; };
ElseIf.prototype.getHeader = function() {
  return ELSEIF_HEADER.replace('%condition%', this.condition);
};

function Else() {
  Node.apply(this, arguments);
  this.tagName = 'else';
  this.closingTag = 'if';
}
extend(Node.prototype, Else.prototype);

Else.prototype.getHeader = function() {
  return ELSE_HEADER;
};

var forExpr = /^\s*([$A-Z_][0-9A-Z_$]+)\s+in\s(.+)\s*$/i;
function For(expr) {
  Node.apply(this, arguments);
  this.tagName = this.closingTag = 'for';

  var parsed = forExpr.exec(expr);
  if (parsed === null) {
    throw new Error('Invalid for expression: "'+expr+'"\n' +
        'Expected format is "for iterator in collection"');
  }

  this.source = parsed[2];
  this.variable = parsed[1];
}
extend(Node.prototype, For.prototype);

For.prototype.getHeader = function() {
  return FOR_HEADER.replace('%source%', this.source).replace('%variable%', this.variable);
};
For.prototype.getFooter = function() {
  return FOR_FOOTER;
};


function Jsx() {
  Node.call(this);
  this.tagName = this.closingTag = 'jsx';
}
extend(Node.prototype, Jsx.prototype);

Jsx.prototype.getHeader = function() {
  return JSX_HEADER;
};
Jsx.prototype.getFooter = function() {
  return JSX_FOOTER;
};

var nodes = {
  'if': If,
  'elseif': ElseIf,
  'else': Else,
  'for': For,
  'jsx': Jsx
};

// Makes a tree from the <? ?> block statements
function parseTree(text) {
  var tagStart, tagEnd;
  var cur = 0;
  var substr = '';
  var match;

  var root = new Root();
  var currentNode = root;

  var tagName, params, newBloc;

  // Preformatting
  text = text.replace(/<!--([^]*?)-->/gm, '').replace(/<%=([^]*?)%>/gm, '{$1}');

  while ((tagStart = text.indexOf('<?', cur) + 2 ) != 1 &&
    (tagEnd = text.indexOf('?>', tagStart)) != -1) {

    substr = text.substr(tagStart, tagEnd-tagStart);
    match = tagExpr.exec(substr);

    if (tagStart - 2 - cur != 0) {
      currentNode.onContent(text.substr(cur, tagStart-2-cur));
    }

    if (match == null) {
      throw new Error("Cannot parse expression : " + substr);
    }

    tagName = match[1].replace(/\s/g, '');
    params = match[2];

    if (tagName == 'name') {
      root.tpl_name = params.replace(/\s/g, '');
    } else if (nodes[tagName] !== undefined) {
      newBloc = new nodes[tagName](params);
      currentNode = currentNode.onNext(newBloc);
    } else if (tagName == 'end') {
      if (params.replace(/\s/g, '') === currentNode.closingTag) {
        currentNode = currentNode.parent;
      } else
        throw new Error("Unexpected "+substr);
    } else {
      throw new Error("Cannot parse expression : " + substr);
    }

    cur = tagEnd+2;
  }

  // appends the last bits
  if (text.length - cur != 0) {
    root.onContent(text.substr(cur, text.length-cur));
  }

  if (currentNode !== root)
    throw new Error("Expected end "+currentNode.closingTag+" at end of file");


  return root;
}

var jsxify = exports.jsxify = function (text) {
  var tree = parseTree(text);
  return tree.render();
};

exports.transform = function(text) {
  return transform(jsxify(text));
}
