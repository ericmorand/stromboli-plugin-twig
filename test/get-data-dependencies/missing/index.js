require('./foo');
require('./bar.js');
require('./bar.html');

module.exports = function() {
  require('./bar.twig');
};