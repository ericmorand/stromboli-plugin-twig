module.exports = function(plugin) {
  plugin.twig.extendFunction('dummy', function() {
    return 'Dummy';
  });

  return {
    foo: 'bar'
  };
};