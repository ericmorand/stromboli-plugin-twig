let i = 0;
let j = require('./other.data');

module.exports = function() {
  i += j();

  return i;
};