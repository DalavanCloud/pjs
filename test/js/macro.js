// generated by pjs -- do not edit
var x = function(y) {
  return 1 + y;
};
var x;
switch (typeof(3)) {
  case "undefined":
    throw new Error("undefined sexp");
    break;
  case "string":
    x = "str";
    break;
  case "number":
    x = "num";
    break;
  default:
    if (pjs.isSym(3)) {
      x = "sym";
    } else {
      x = "sexp";
    }
    break;
}
for (var __pjs_1 = 0; __pjs_1 < [bar, baz].length; ++__pjs_1) {
  var foo = [bar, baz][__pjs_1];
  console.log(foo);
}
if (!(3 == 3)) {
  throw new Error("equal");
}
4;
