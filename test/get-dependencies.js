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

  test.test('should resolve with data dependencies', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/data/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/data/index.twig'),
          path.resolve('test/get-dependencies/data/index.twig.data.js'),
          path.resolve('test/get-dependencies/data/foo.js')
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