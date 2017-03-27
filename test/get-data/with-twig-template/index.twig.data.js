module.exports = {
  content: require('./foo.twig').render({
    foo: 'foo'
  })
};