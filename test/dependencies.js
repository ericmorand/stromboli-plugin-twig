const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');

var plugin = new Plugin({}, 'twig', 'index.twig');

test('dependencies', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/valid/index.twig')).then(
    function (template) {
      return plugin.getDependencies(template).then(
        function (results) {
          t.equal(results.length, 6);
        },
        function (err) {
          t.fail(err);
        }
      );
    }
  )
});

test('missing dependencies', function (t) {
  return plugin.compile(path.resolve('test/dependencies/missing/index.twig')).then(
    function (template) {
      return plugin.getDependencies(template).then(
        function (results) {
          t.fail();
        },
        function (err) {
          t.equal(err.file, path.resolve('test/dependencies/missing/missing.twig'));
          t.ok(err.message);
        }
      );
    }
  )
});

test('circular dependencies', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/circular/index.twig')).then(
    function (template) {
      return plugin.getDependencies(template).then(
        function (results) {
          t.equal(results.length, 2);
        },
        function (err) {
          t.fail(err);
        }
      );
    }
  );
});

test('dependencies inside loop', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/loop/index.twig')).then(
    function (template) {
      return plugin.getDependencies(template).then(
        function (results) {
          t.equal(results.length, 2);
        },
        function (err) {
          t.fail(err);
        }
      );
    }
  );
});

test('dependencies inside macro', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/macro/index.twig')).then(
    function (template) {
      return plugin.getDependencies(template).then(
        function (results) {
          t.equal(results.length, 3);
        },
        function (err) {
          t.fail(err);
        }
      );
    }
  );
});