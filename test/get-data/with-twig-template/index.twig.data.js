const path = require('path');

module.exports = function(renderer) {
  return {
    content: renderer.render(path.resolve('test/get-data/with-twig-template/foo.twig'), {
      foo: 'foo'
    })
  }
};