const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDependencies', function (test) {
  test.plan(3);

  test.test('should resolve with dependencies on error', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/error/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/error/index.twig'),
          path.resolve('test/get-dependencies/error/partial.twig'),
          path.resolve('test/get-dependencies/error/index.twig.data.js')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should resolve with dependencies on missing dependency', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/missing/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/missing/index.twig'),
          path.resolve('test/get-dependencies/missing/partial.twig'),
          path.resolve('test/get-dependencies/missing/index.twig.data.js')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should resolve with dependencies when data requires a twig template', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/data-with-twig-template/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/data-with-twig-template/index.twig'),
          path.resolve('test/get-dependencies/data-with-twig-template/index.twig.data.js'),
          path.resolve('test/get-dependencies/data-with-twig-template/foo.twig'),
          path.resolve('test/get-dependencies/data-with-twig-template/bar.twig')
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