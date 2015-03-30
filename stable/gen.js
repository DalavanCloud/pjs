// generated by pjs -- do not edit
var symlib = require("./symbol"); /* macro definition */ ;
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
  "||": 6,
  "=": 3,
  "+=": 3,
  "()": 19,
  ",": 1,
  "none": 1
};
exports.precTable = precTable;
var binops = {
  "+": true,
  "-": true,
  "*": true,
  "/": true,
  "=": true,
  "==": true,
  "!=": true,
  "<": true,
  ">": true,
  "<=": true,
  ">=": true,
  "&&": true,
  "||": true,
  "in": true
};
var unops = {
  "++": true,
  "--": true,
  "!": true
};

function jsStmt(sexp) {
  var g = gen(sexp);
  if (!g.prec) {
    return g.code;
  }
  var code = g.code;
  if (!symlib.isSymbol(sexp[0], "function")) {
    code += ";";
  }
  return code;
}

function jsExpr(sexp, prec) {
  var g = gen(sexp);
  if (!g.prec) {
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

function stringQuote(str) {
  return "\x22" + str + "\x22";
}
exports.stringQuote = stringQuote;

function genForm(sexp) {
  var op = (sexp[0].sym)();
  if (op in binops) {
    var args = sexp.slice(1);
    var exprs = args.map(function(e) {
      return jsExpr(e, op);
    });
    var js = exprs.join(" " + op + " ");
    return snippet(js, op);
  }
  if (op in unops) {
    var js = op + jsExpr(sexp[1], op);
    return snippet(js, op);
  }
  switch (op) {
    case "if":
      if (sexp.length < 3 || sexp.length > 4) {
        throw new Error("bad args to 'if'");
      }
      var cond = jsExpr(sexp[1], "none");
      var body = jsStmt(sexp[2]);
      var js = "if (" + cond + ") {" + body + "}";
      if (sexp.length == 4) {
        var elsebody = jsStmt(sexp[3]);
        js += " else {" += elsebody += "}";
      }
      return snippet(js);
  }
  if (!false) {
    throw new Error("unimplemented");
  }
}

function gen(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return snippet(stringQuote(sexp), "lit");
    case "number":
      return snippet(sexp, "lit");
    default:
      if (pjs.isSymbol(sexp)) {
        return snippet(sexp.sym(), "lit");
      } else {
        return genForm(sexp);
      }
  }
}

function genStmts(sexps) {
  var js = "";
  for (var __pjs_1 = 0; __pjs_1 < sexps.length; ++__pjs_1) {
    var sexp = sexps[__pjs_1];
    js += jsStmt(sexp);
  }
  return js;
}
exports.genStmts = genStmts;
