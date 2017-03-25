const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');
const Twig = require('twig');

let plugin = new Plugin({});

plugin.twig = Twig;

tap.test('compile', function (test) {
  test.plan(2);

  test.test('should return template and data on success', function(test) {
    return plugin.compile(path.resolve('test/compile/valid/index.twig')).then(
      function (result) {
        test.ok(result.template);
        test.ok(result.data);

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should return file and message on error', function(test) {
    return plugin.compile(path.resolve('test/compile/error/index.twig')).then(
      function (result) {
        test.fail();

        test.end();
      },
      function (err) {
        test.equal(err.file, path.resolve('test/compile/error/index.twig'));
        test.ok(err.message);

        test.end();
      }
    )
  });
});