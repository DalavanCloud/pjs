var fs = require('fs');
var beautify = require('js-beautify').js_beautify;
var sexpp = require('./sexp');
var parseArgs = require('minimist');
var util = require('./util');
var macrolib = require('./macro');
var qqlib = require('./quasi');
var symlib = require('./symbol');

// Expose a global pjs object so it can be found by macro evals.
global.pjs = {
  assoc: util.assoc,
  sym: symlib.sym,
  isSymbol: symlib.isSymbol,
};

var genSym = {
  num: 0,
  get: function() {
    return '__pjs_' + genSym.num;
  },
  next: function() {
    genSym.num++;
    return genSym.get();
  }
};

var macros = {
  genSym: genSym.next,
};

var libmacros = ['fn', 'caseSexp', 'forEach'];
for (var i = 0; i < libmacros.length; i++) {
  macros[libmacros[i]] = macrolib[libmacros[i]];
}

function evalStmts(code) {
  code = [['var', 'f', ['function', []].concat(code)], ['f']];
  var js = genStmts(code);
  // console.log('js', js);
  return eval(js);
}

function genMacro(sexp, outVar) {
  var name = sexp[0].sym();
  var args = sexp.slice(1);
  var macro = macros[name];

  var code = macro.apply(null, args);
  // console.log('macro result', typeof code, code);

  var exp = gen2(code, outVar);
  // console.log('gen', exp);
  return exp;
}

function genAsStmt(sexp, outVar) {
  // console.log('genAsStmt', sexp, outVar);
  var g = gen2(sexp, outVar);
  var code = g.code;
  if (g.expr) {
    if (outVar) {
      if (outVar == 'return') {
        code = 'return ' + code + ';';
      } else {
        code = outVar + "=" + code + ";";
      }
    } else {
      var end = code[code.length - 1];
      if (end != ';' && end != '}') {
        code += ';';
      }
    }
  }
  return code;
}

function genAsExpr(sexp) {
  var g = gen2(sexp);
  if (!g.expr) {
    throw new Error("in " + sexp + " stmt here not supported, had code " + g.code);
  }
  return g.code;
}

function mkStmt(code) {
  return {code:code, expr:false};
}

function stringQuote(str) {
  return "\"" + str + "\"";
}

var precTable = {
  'lit': 0,
  'function': 0,
  'new': 0,
  'list': 0,  // e.g. [1, 2, 3]
  'call': 0,  // e.g. foo(bar)

  'instanceof': 0,
  'obj': 1,  // object literal, e.g. {1: 2}.

  '.':  1,

  '<':  1,

  '=':  1,
  '==': 1,
  '!=': 1,
  '+=': 1,

  '&&': 1,

  '+':  1,
  '-':  1,

  '[]': 1,
  '()': 1,  // forced parens
};

function mkExpr(code, prec) {
  if (!(prec in precTable)) {
    throw new Error('unknown precedence: ' + prec);
  }
  return {code:code, expr:true, prec:precTable[prec]};
}

function gen2(sexp, outVar) {
  // console.log('gen2', typeof sexp, sexp, outVar);

  if (typeof sexp === 'undefined') {
    throw new Error('undefined sexp');
  }

  if (typeof sexp === 'string') {
    return mkExpr(stringQuote(sexp), 'lit');
  }
  if (typeof sexp === 'number') {
    return mkExpr(sexp, 'lit');
  }
  if (symlib.isSymbol(sexp)) {
    return mkExpr(sexp.sym(), 'lit');
  }

  if (sexp.length === 0) {
    return mkStmt(';');
  }

  if (symlib.isSymbol(sexp[0])) {
    switch (sexp[0].sym()) {
    case '+': case '-': case '=': case '<': case '&&': case '!=': case '+=': case '==': case '>=':
      return mkExpr('(' + sexp.slice(1).map(genAsExpr).join(sexp[0].sym()) + ')', sexp[0].sym());
    case '.':
      var obj = genAsExpr(sexp[1]);
      var attr = sexp[2].sym();
      var args = sexp.slice(3);
      var str = obj + '.' + attr;
      if (args.length > 0) {
        str += '(' + args.map(genAsExpr).join(',') + ')';
      }
      return mkExpr(str, '.');
    case 'var':
      var name = sexp[1].sym();
      var js = 'var ' + name;
      if (sexp.length > 2) {
        var val = sexp[2];
        var g = gen2(val, name);
        if (g.expr) {
          js += ' = ' + g.code + ';';
        } else {
          js += ';' + g.code;
        }
      } else {
        js += ';';
      }
      return mkStmt(js);
    case 'function':
      sexp = sexp.slice(1);
      var name = '';
      if (symlib.isSymbol(sexp[0])) {
        name = sexp[0].sym();
        sexp = sexp.slice(1);
      }
      var args = sexp[0];
      var vararg = null;
      for (var i = 0; i < args.length; i++) {
        if (args[i].sym() == '.') {
          vararg = args[i+1];
          args = args.slice(0, i);
          break;
        }
      }
      var body = sexp.slice(1);
      var js = 'function ' + name + '(' + args.map(function(arg) { return arg.sym() }).join(',') + ') {';
      if (vararg) {
        js += genAsStmt([pjs.sym('var'), vararg, [pjs.sym('Array.prototype.slice.call'), pjs.sym('arguments'), i]], null);
      }
      js += genStmts(body);
      js += '}\n';
      return mkExpr(js, 'function');
    case 'return':
      var body = gen2(sexp[1], 'return');
      if (body.expr) {
        return mkStmt('return ' + body.code + ';');
      } else {
        return body;
      }
    case 'for':
      var js = 'for (';
      js += genAsStmt(sexp[1]);
      js += genAsStmt(sexp[2]);
      js += genAsStmt(sexp[3]);
      // XXX need to remove last semi for for loop
      var end = js[js.length - 1];
      if (end == ';') {
        js = js.substr(0, js.length - 1);
      }
      js += ') {';
      js += genStmts(sexp.slice(4));
      js += '}\n';
      return mkStmt(js);
    case 'throw':
      // Intentionally disregard outVar -- the exception throw will
      // never set it.
      return mkStmt('throw ' + genAsExpr(sexp[1]) + ';');
    case 'switch':
      var js = 'switch (' + genAsExpr(sexp[1]) + ') {';
      sexp.slice(2).forEach(function(scase) {
        var str = 'case ' + genAsExpr(scase[0]) + ':\n';
        if (symlib.isSymbol(scase[0]) && scase[0].sym() == 'default') {
          str = 'default:\n';
        }
        js += str + genStmts(scase.slice(1), outVar);
        if (outVar && outVar != 'return')
          js += 'break;';
      });
      js += '}';
      return mkStmt(js);
    case 'at':
      return mkExpr(genAsExpr(sexp[1]) + '[' + genAsExpr(sexp[2]) + ']', '[]');
    case 'while':
      return mkStmt('while (' + genAsExpr(sexp[1]) + ') {\n' +
        genStmts(sexp.slice(2)) +
        '}');
    case 'break':
      return mkStmt('break;');
    case 'continue':
      return mkStmt('continue;');
    case 'new':
      return mkExpr('new ' + sexp[1].sym() + '(' + sexp.slice(2).map(genAsExpr).join(',') + ')', 'new');
    case 'if':
      if (sexp.length < 3 || sexp.length > 4) {
        throw 'bad if';
      }

      // TODO factor this out.
      var js = '';
      var exp = gen2(sexp[1], genSym.get());
      if (!exp.expr) {
        js += exp.code;
        exp = genSym.get();
        genSym.next();
      } else {
        exp = exp.code;
      }

      js += 'if (' + exp + ') {';
      js += genAsStmt(sexp[2], outVar);
      js += '}\n';
      if (sexp.length == 4) {
        js += " else {\n" + genAsStmt(sexp[3], outVar) + "}\n";
      }
      return mkStmt(js);
    case 'do':
      return mkStmt(genStmts(sexp.slice(1), outVar));
    case 'list':
      // XXX rewrite as macro?
      return mkExpr("[" + sexp.slice(1).map(genAsExpr) + "]", 'list');
    case 'qq':
      return gen2(qqlib.qq(sexp[1]), outVar);
    case 'pp':
      return mkExpr('(' + genAsExpr(sexp[1]) + ')', '()');
    case 'instanceof':
      return mkExpr('(' + genAsExpr(sexp[1]) + ' instanceof ' + genAsExpr(sexp[2]) + ')', 'instanceof');
    case 'obj':
      var js = '{';
      for (var i = 1; i < sexp.length; i += 2) {
        if (i > 1) {
          js += ', ';
        }
        var key = sexp[i];
        if (pjs.isSymbol(key)) {
          key = key.sym();
        } else if (typeof key == 'string') {
        } else {
          throw new Error('cannot make obj literal with ' + key);
        }
        var val = genAsExpr(sexp[i+1]);
        js += key + ':' + val;
      }
      js += '}';
      return mkExpr(js, 'obj');
      break;
    case '#macro':
      var name = sexp[1];
      var args = sexp[2];
      var body = sexp.slice(3);

      var fn = new Function(args.join(','), genStmts(body));
      macros[name] = fn;
      return mkExpr('/* macro definition */', 'comment');
    default:
      if (macros[sexp[0].sym()]) {
        return genMacro(sexp, outVar);
      }
    }
  }

  return mkExpr(genAsExpr(sexp[0]) + '(' + sexp.slice(1).map(genAsExpr).join(',') + ')', 'call');
}

function genStmts(sexps, outVar) {
  var js = '';
  for (var i = 0; i < sexps.length; i++) {
    if (i < sexps.length - 1) {
      js += genAsStmt(sexps[i], null);
    } else {
      js += genAsStmt(sexps[i], outVar);
    }
  }
  return js;
}

var args = parseArgs(process.argv.slice(2), {
  boolean: ['u', 'n'],
  string: ['_'],
  unknown: function(arg) {
    if (arg[0] === '-') {
      console.log('unknown arg', arg);
      process.exit(1);
    }
    return true;
  }
});

var infile = args._[0];
var outfile = args._[1];
var data = fs.readFileSync(infile);

var p = sexpp.parse(data);
// console.log(p);

var js = genStmts(p);
js = '// generated by pjs -- do not edit\n' + js;
if (args.n) {
  var gen = require('./gen');
  js = gen.genStmts(p);
}

if (!args.u) {
  js = beautify(js, {indent_size:2});
}
fs.writeFileSync(outfile, js);
