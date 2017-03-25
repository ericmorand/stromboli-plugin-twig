const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDependencies', function (test) {
  test.plan(1);

  test.test('should handle error', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/error/index.twig')).then(
      function (results) {
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
});