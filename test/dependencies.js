const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');
const Twig = require('twig');

var plugin = new Plugin({});

plugin.twig = Twig;

test('dependencies', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/valid/index.twig')).then(
    function (result) {
      return plugin.getDependencies(result.template).then(
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
    function (result) {
      return plugin.getDependencies(result.template).then(
        function (results) {
          t.equal(results.length, 3);
        },
        function (err) {
          t.fail(err);
          // let err = result.error;
          // let dependencies = result.dependencies;
          //
          // t.equal(dependencies.length, 3);
          //
          // t.equal(err.file, path.resolve('test/dependencies/missing/missing.twig'));
          // t.ok(err.message);
        }
      );
    }
  )
});

test('circular dependencies', function (t) {
  t.plan(1);

  return plugin.compile(path.resolve('test/dependencies/circular/index.twig')).then(
    function (result) {
      return plugin.getDependencies(result.template).then(
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
    function (result) {
      return plugin.getDependencies(result.template).then(
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
    function (result) {
      return plugin.getDependencies(result.template).then(
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

test('dependencies with error', function (t) {
  return plugin.compile(path.resolve('test/dependencies/error/index.twig')).then(
    function (result) {
      return plugin.getDependencies(result.template).then(
        function (results) {
          t.fail();
        },
        function (result) {
          let err = result.error;
          let dependencies = result.dependencies;

          t.equal(dependencies.length, 1);
          t.equal(err.file, path.resolve('test/dependencies/error/partial.twig'));
          t.true(err.message);
        }
      );
    }
  );
});