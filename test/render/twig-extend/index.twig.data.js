module.exports = function(plugin) {
  plugin.twig.extendFunction('foo', function() {
    return 'foo';
  });

  plugin.twig.extend(function (Twig) {
    Twig.exports.extendTag({
      type: 'foo',
      regex: /^foo$/,
      next: ['endfoo'],
      open: true,
      parse: function (token, context, chain) {
        let output = Twig.parse.apply(this, [token.output, context]);

        return {
          chain: chain,
          output: 'foo-' + output
        };
      }
    });

    Twig.exports.extendTag({
      type: 'endfoo',
      regex: /^endfoo$/,
      next: [],
      open: false
    });
  });

  return {
    foo: 'bar'
  };
};