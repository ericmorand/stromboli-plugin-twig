const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDataDependencies', function (test) {
  test.plan(4);

  test.test('should resolve with dependencies', function (test) {
    return plugin.getDataDependencies(path.resolve('test/get-data-dependencies/index.js')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-data-dependencies/index.js'),
          path.resolve('test/get-data-dependencies/foo.js')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should resolve with dependencies on error', function (test) {
    return plugin.getDataDependencies(path.resolve('test/get-data-dependencies/error/index.js')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-data-dependencies/error/index.js')
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
    return plugin.getDataDependencies(path.resolve('test/get-data-dependencies/missing/index.js')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-data-dependencies/missing/index.js'),
          path.resolve('test/get-data-dependencies/missing/foo.js'),
          path.resolve('test/get-data-dependencies/missing/foo/index.js'),
          path.resolve('test/get-data-dependencies/missing/bar.js'),
          path.resolve('test/get-data-dependencies/missing/bar.html'),
          path.resolve('test/get-data-dependencies/missing/bar.twig')
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
    return plugin.getDataDependencies(path.resolve('test/get-data-dependencies/data-with-twig-template/index.js')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-data-dependencies/data-with-twig-template/index.js'),
          path.resolve('test/get-data-dependencies/data-with-twig-template/foo.twig'),
          path.resolve('test/get-data-dependencies/data-with-twig-template/bar.twig')
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