const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');

var plugin = new Plugin({}, 'twig', 'index.twig');

test('data sync', function (t) {
  t.plan(1);

  return plugin.getData(path.resolve('test/data/sync/index.twig')).then(
    function (results) {
      var wanted = {
        files: [
          path.resolve('test/data/sync/index.twig.data.js'),
          path.resolve('test/data/sync/other.data.js'),
          path.resolve('test/data/sync/sub/index.data.js')
        ],
        data: {
          content: "Lorem ipsum",
          otherData: {
            content: "Dolor sit amet",
            otherData: {
              content: "Consectetur adipiscing elit"
            }
          }
        }
      };

      t.same(results, wanted);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

test('data async', function (t) {
  return plugin.getData(path.resolve('test/data/async/index.twig')).then(
    function (results) {
      var wanted = {
        files: [
          path.resolve('test/data/async/index.twig.data.js'),
          path.resolve('test/data/async/other.data.js'),
          path.resolve('test/data/async/sub/index.data.js')
        ],
        data: {
          content: "Lorem ipsum",
          otherData: {
            content: "Dolor sit amet",
            otherData: {
              content: "Consectetur adipiscing elit"
            }
          }
        }
      };

      wanted.files.forEach(function (wantedFile) {
        t.true(results.files.indexOf(wantedFile) > -1);
      });

      t.same(results.data, wanted.data);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

// should not reject, templates without data are perfectly fine
test('missing data', function (t) {
  t.plan(1);

  return plugin.getData(path.resolve('test/data/missing/index.twig')).then(
    function (results) {
      var wanted = {
        files: [],
        data: null
      };

      t.same(results, wanted);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

test('data cache', function (t) {
  t.plan(1);

  return plugin.getData(path.resolve('test/data/cache/index.twig')).then(
    function (results) {
      return plugin.getData(path.resolve('test/data/cache/index.twig')).then(
        function (results) {
          t.same(results.data, 1);
        }
      );
    }
  );
});