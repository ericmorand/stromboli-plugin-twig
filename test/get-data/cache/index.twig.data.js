let i = 0;
let j = require('./other.data.js');

module.exports = function() {
  i += j();

  return i;
};