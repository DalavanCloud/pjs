// generated by pjs -- do not edit
function Symbol(name) {
  this.symbol = name;
}
Symbol.prototype.toString = function() {
  return "sym(" + this.symbol + ")";
};

function str(sym) {
  return sym.symbol;
}

function isSym(obj, match) {
  if (!(obj instanceof Symbol)) {
    return false;
  }
  if (match && obj.symbol != match) {
    return false;
  }
  return true;
}
var symbols = {};

function get(name) {
  var s = symbols[name];
  if (!s) {
    s = new Symbol(name);
    symbols[name] = s;
  }
  return s;
}
genSym = ({
  num: 0,
  peek: function() {
    return "__pjs_" + genSym.num;
  },
  take: function() {
    var sym = genSym.peek();
    ++genSym.num;
    return sym;
  }
});
exports.isSym = isSym;
exports.get = get;
exports.str = str;
exports.genSym = genSym;
