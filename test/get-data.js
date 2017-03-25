const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getData', function (test) {
  test.plan(5);

  test.test('should support sync data', function (test) {
    return plugin.getData(path.resolve('test/get-data/sync/index.twig')).then(
      function (results) {
        let wanted = {
          files: [
            path.resolve('test/get-data/sync/index.twig.data.js')
          ],
          data: {
            content: "Lorem ipsum"
          }
        };

        test.same(results, wanted);

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
      function (results) {
        let wanted = {
          files: [
            path.resolve('test/get-data/async/index.twig.data.js')
          ],
          data: {
            content: "Lorem ipsum"
          }
        };

        wanted.files.forEach(function (wantedFile) {
          test.true(results.files.indexOf(wantedFile) > -1);
        });

        test.same(results.data, wanted.data);

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
      function (results) {
        let wanted = {
          files: [],
          data: null
        };

        test.same(results, wanted);

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
      function (results) {
        return plugin.getData(path.resolve('test/get-data/cache/index.twig')).then(
          function (results) {
            test.equal(results.data, 1);

            test.end();
          }
        );
      }
    );
  });

  test.test('should handle data error', function (test) {
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
});