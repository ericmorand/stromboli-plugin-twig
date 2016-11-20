const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');

var plugin = new Plugin({}, 'twig', 'index.twig');

test('data sync', function (t) {
  t.plan(1);

  return plugin.getTemplateData(path.resolve('test/data/sync/index.twig')).then(
    function (results) {
      var awaited = {
        files: [
          path.resolve('test/data/sync/index.data.js'),
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

      t.same(results, awaited);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

test('data async', function (t) {
  t.plan(1);

  return plugin.getTemplateData(path.resolve('test/data/async/index.twig')).then(
    function (results) {
      var awaited = {
        files: [
          path.resolve('test/data/async/index.data.js'),
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

      t.same(results, awaited);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});

// should not reject, templates without data are perfectly fine
test('missing data', function (t) {
  t.plan(1);

  return plugin.getTemplateData(path.resolve('test/data/missing.twig')).then(
    function (results) {
      var awaited = {
        files: [],
        data: null
      };

      t.same(results, awaited);
    },
    function (err) {
      t.fail(err.message);
    }
  );
});