// generated by pjs -- do not edit
function toStr(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return "\x22" + sexp + "\x22";
    case "number":
      return "" + sexp;
    default:
      if (pjs.isSym(sexp)) {
        return pjs.sym(sexp);
      } else {
        return "(" + sexp.map(toStr).join(" ") + ")";
      }
  }
}
exports.toStr = toStr;
