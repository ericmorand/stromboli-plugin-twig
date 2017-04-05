module.exports = function(renderer) {
  return {
    content: renderer.render(require('./foo.twig'), {
      foo: 'foo'
    })
  }
};