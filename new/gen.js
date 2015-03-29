// generated by pjs -- do not edit
var symlib = require("./symbol");
var precTable = {
  "lit": 19,
  "list": 19,
  "[]": 18,
  ".": 18,
  "new": 18,
  "call": 18,
  "!": 15,
  "~": 15,
  "++": 15,
  "--": 15,
  "*": 14,
  "/": 14,
  "%": 14,
  "+": 13,
  "-": 13,
  "<": 11,
  ">": 11,
  "instanceof": 11,
  "in": 11,
  "==": 10,
  "!=": 10,
  "obj": 1,
  "&&": 6,
  "=": 3,
  "+=": 3,
  "()": 19,
  ",": 1,
  "none": 1
};
exports.precTable = precTable;

function jsStmt(sexp) {
  var g = gen(sexp);
  if (!g.expr) {
    return g.code;
  }
  var code = g.code;
  if (!symlib.isSymbol(sexp[0], "function")) {
    g.code += ";";
  }
  return code;
}

function jsExpr(sexp, prec) {
  var g = gen(sexp);
  if (!g.expr) {
    throw new Error("in " + sexp + " stmt here not supported, had code " + g.code);
  }
  if (!(prec in precTable)) {
    throw new Error("unknown prec " + prec);
  }
  var prec = precTable[prec];
  if (prec > g.prec) {
    return "(" + g.code + ")";
  } else {
    return g.code;
  }
}

function snippet(code, prec) {
  if (prec) {
    if (!(prec in precTable)) {
      throw new Error("unknown prec " + prec);
    }
    prec = precTable[prec];
  }
  return {
    code: code,
    prec: prec
  };
}
var gen2;
exports.setGen2 = function(g) {
  gen2 = g;
};

function stringQuote(str) {
  return "\x22" + str + "\x22";
}
exports.stringQuote = stringQuote;

function gen(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      snippet(stringQuote(sexp), "lit");
    case "number":
      0;
    default:
      if (pjs.isSymbol(sexp)) {
        0;
      } else {
        0;
      }
  }
}