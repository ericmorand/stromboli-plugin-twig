const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDependencies', function (test) {
  test.plan(2);

  test.test('should return dependencies, file and message on error', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/error/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (result) {
        let err = result.error;
        let dependencies = result.dependencies;

        test.equal(dependencies.length, 2);
        test.equal(err.file, path.resolve('test/get-dependencies/error/partial.twig'));
        test.ok(err.message);

        test.end();
      }
    )
  });

  test.test('should return dependencies on missing dependency', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/missing/index.twig')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/missing/index.twig'),
          path.resolve('test/get-dependencies/missing/partial.twig')
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