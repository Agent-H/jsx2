
/*
  Copies properties of src into dest
*/
exports.extend = function(src, dest) {
  dest = dest || {};
  for (var i in src) {
    dest[i] = src[i];
  }
  return dest;
}

exports.version = "0.0.0";
exports.libName = "jsx2";
