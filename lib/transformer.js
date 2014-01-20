
var transform = require('react-tools').transform;


var tagExpr = /^\s*(if|else if|elseif|else|end|name|for|jsx)(?:\s(.*))?\s*$/;

var ROOT_HEADER = "/** @jsx React.DOM */ "+
    "(function (root, factory) {"+
    "  if (typeof define === 'function' && define.amd) {"+
    "    define(['exports'], factory);"+
    "  } else if (typeof exports === 'object') {"+
    "    factory(exports);"+
    "  } else {"+
    "    factory((root.%name% = {}));"+
    "  }"+
    "}(this, function (exports) {"+
    "exports.componentWillMount = function(){"+
    "  this.templateContext = this;"+
    "};"+
    "exports.getTemplateContext = function() {"+
    "  return this.templateContext;"+
    "};"+
    "exports.render = function(){"+
    "  var ctx = this.getTemplateContext();"+
    "  return (";

var ROOT_FOOTER = ");};}));";

var IF_HEADER = "(function(){" +
      "if (%condition%){" +
      "return (";
var IF_FOOTER = ");}}())";
var ELSEIF_HEADER = ");} else if (%condition%) {" +
      "return (";

var ELSE_HEADER = ");} else {" +
      "return (";

var FOR_HEADER = "Array.prototype.map.call(%source%, function(%variable%) {" +
    "  return (";
var FOR_FOOTER = ");})";

var JSX_HEADER = "(function(){";
var JSX_FOOTER = "}())";

var START_TAG = '<%';
var END_TAG = '%>';


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

Node.prototype.sanitizeFirstString = function(str) {
  var match;
  if (/^\s*[^ \r\n\t<{]/.test(str)) {
    return JSON.stringify(str);
  } else if ((match = /^(\s*){(.+)}(\s*)$/.exec(str)) != null) {
    return match[2];
  }
  return str;
};

Node.prototype.onContent = function(content) {
  this.children.push(content);
};

Node.prototype.render = function(isFirst) {
  if (typeof isFirst === 'undefined') isFirst = true;
  var ret = this.getHeader(isFirst);
  var hasFirstElement = false;

  for (var i in this.children) {
    var el = this.children[i];
    console.log(i + '[' + hasFirstElement + '] :' + el);
    if (typeof el === 'string') {
      if (!hasFirstElement && !/^\s+$/.test(el)) {
        // first non-empty string
        ret += this.sanitizeFirstString(el);
        hasFirstElement = true;
      } else {
        ret += el;
      }
    } else {
      ret += el.render(!hasFirstElement);
      hasFirstElement = true;
    }
  }

  return ret + this.getFooter(isFirst);
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

If.prototype.getHeader = function(isFirst) {
  return (isFirst ? '' : '{') + IF_HEADER.replace('%condition%', this.condition);
};

If.prototype.getFooter = function(isFirst) {
  return IF_FOOTER + (isFirst ? '' : '}');
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

var forExpr = /^\s*([$A-Z_][0-9A-Z_$]*)\s+in\s+(.+)\s*$/i;
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

For.prototype.getHeader = function(isFirst) {
  return (isFirst ? '' : '{') + FOR_HEADER.replace('%source%', this.source).replace('%variable%', this.variable);
};
For.prototype.getFooter = function(isFirst) {
  return FOR_FOOTER + (isFirst ? '' : '}');
};


function Jsx() {
  Node.call(this);
  this.tagName = this.closingTag = 'jsx';
}
extend(Node.prototype, Jsx.prototype);

Jsx.prototype.getHeader = function(isFirst) {
  return (isFirst ? '' : '{') + JSX_HEADER;
};
Jsx.prototype.getFooter = function(isFirst) {
  return JSX_FOOTER + (isFirst ? '' : '}');
};

Jsx.prototype.sanitizeFirstString = function(str) {
  return str;
};

var nodes = {
  'if': If,
  'elseif': ElseIf,
  'else': Else,
  'for': For,
  'jsx': Jsx
};

// Makes a tree from the <% %> block statements
function parseTree(text) {
  var tagStart, tagEnd;
  var cur = 0;
  var substr = '';
  var match;

  var root = new Root();
  var currentNode = root;

  var tagName, params, newBloc;

  // Preformatting
  text = text.replace(/<!--([^]*?)-->/gm, '');

  while ((tagStart = text.indexOf(START_TAG, cur) + 2 ) != 1 &&
    (tagEnd = text.indexOf(END_TAG, tagStart)) != -1) {

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
  return parseTree(text).render();
};

exports.transform = function(text) {
  var jsxed = jsxify(text);
  console.log(jsxed);
  return transform(jsxed);
}
