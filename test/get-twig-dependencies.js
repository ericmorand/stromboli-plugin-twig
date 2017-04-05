const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getTwigDependencies', function (test) {
  test.plan(1);

  test.test('should resolve with dependencies', function (test) {
    return plugin.getTwigDependencies(path.resolve('test/get-twig-dependencies/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-twig-dependencies/index.twig'),
          path.resolve('test/get-twig-dependencies/foo.twig'),
          path.resolve('test/get-twig-dependencies/bar.twig')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });
});