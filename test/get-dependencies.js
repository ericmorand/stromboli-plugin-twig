const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDependencies', function (test) {
  test.plan(1);

  test.test('should resolve with both data and twig dependencies', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/index.twig'),
          path.resolve('test/get-dependencies/partial.twig'),
          path.resolve('test/get-dependencies/index.twig.data.js'),
          path.resolve('test/get-dependencies/foo.js')
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