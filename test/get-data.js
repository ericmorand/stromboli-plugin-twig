const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getData', function (test) {
  test.plan(8);

  test.test('should support sync data', function (test) {
    return plugin.getData(path.resolve('test/get-data/sync/index.twig')).then(
      function (data) {
        let wanted = {
          content: "Lorem ipsum"
        };

        test.same(data, wanted);

        test.end();
      },
      function (err) {
        test.fail(err.message);

        test.end();
      }
    );
  });

  test.test('should support async data', function (test) {
    return plugin.getData(path.resolve('test/get-data/async/index.twig')).then(
      function (data) {
        let wanted = {
          content: "Lorem ipsum"
        };

        test.same(data, wanted);

        test.end();
      },
      function (err) {
        test.fail(err.message);

        test.end();
      }
    );
  });

  test.test('should support missing data', function (test) {
    return plugin.getData(path.resolve('test/get-data/missing/index.twig')).then(
      function (data) {
        test.notOk(data);

        test.end();
      },
      function (err) {
        test.fail(err.message);

        test.end();
      }
    );
  });

  test.test('should not cache data', function (test) {
    return plugin.getData(path.resolve('test/get-data/cache/index.twig')).then(
      function (data) {
        return plugin.getData(path.resolve('test/get-data/cache/index.twig')).then(
          function (data) {
            test.equal(data, 1);

            test.end();
          }
        );
      }
    );
  });

  test.test('should handle data with error', function (test) {
    return plugin.getData(path.resolve('test/get-data/error/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (err) {
        test.pass(err.message);

        test.end();
      }
    );
  });

  test.test('should handle data with error in function', function (test) {
    return plugin.getData(path.resolve('test/get-data/error-in-function/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (err) {
        test.pass(err.message);

        test.end();
      }
    );
  });

  test.test('should handle data with missing dependency', function (test) {
    return plugin.getData(path.resolve('test/get-data/missing-dependency/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (err) {
        test.equal(err.file, path.resolve('test/get-data/missing-dependency/index.twig.data.js'));
        test.ok(err.message);

        test.end();
      }
    );
  });

  test.test('should support data with twig template', function (test) {
    return plugin.getData(path.resolve('test/get-data/with-twig-template/index.twig')).then(
      function (data) {
        let wanted = {
          content: "foo-bar"
        };

        test.same(data, wanted);

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    );
  });
});