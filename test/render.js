const Plugin = require('../src/plugin');
const Promise = require('promise');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('render', function (test) {
  test.plan(12);

  test.test('should reject with file, message and dependencies on error in entry', function (test) {
    return plugin.render(path.resolve('test/render/error/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (renderResult) {
        test.same(renderResult.sourceDependencies.sort(), [
          path.resolve('test/render/error/index.twig'),
          path.resolve('test/render/error/index.twig.data.js')
        ]);
        test.equal(renderResult.error.file, path.resolve('test/render/error/index.twig'));
        test.ok(renderResult.error.message);

        test.end();
      }
    );
  });

  test.test('should reject with file, message and dependencies on error in partial', function (test) {
    return plugin.render(path.resolve('test/render/error-in-partial/index.twig')).then(
      function () {
        test.fail();

        test.end()
      },
      function (renderResult) {
        test.same(renderResult.sourceDependencies.sort(), [
          path.resolve('test/render/error-in-partial/index.twig'),
          path.resolve('test/render/error-in-partial/index.twig.data.js'),
          path.resolve('test/render/error-in-partial/partial.twig')
        ]);

        test.equal(renderResult.error.file, path.resolve('test/render/error-in-partial/partial.twig'));
        test.ok(renderResult.error.message);

        test.end();
      }
    );
  });

  test.test('should reject with file, message and dependencies on missing partial', function (test) {
    return plugin.render(path.resolve('test/render/missing-partial/index.twig')).then(
      function () {
        test.fail();

        test.end();
      },
      function (renderResult) {
        test.same(renderResult.sourceDependencies.sort(), [
          path.resolve('test/render/missing-partial/index.twig'),
          path.resolve('test/render/missing-partial/index.twig.data.js'),
          path.resolve('test/render/missing-partial/missing.twig')
        ].sort());

        test.equal(renderResult.error.file, path.resolve('test/render/missing-partial/index.twig'));
        test.ok(renderResult.error.message);

        test.end();
      }
    );
  });

  test.test('should reject with file, message and dependencies on error in data', function (test) {
    return plugin.render(path.resolve('test/render/error-in-data/index.twig')).then(
      function () {
        test.fail();

        test.end()
      },
      function (renderResult) {
        test.same(renderResult.sourceDependencies.sort(), [
          path.resolve('test/render/error-in-data/index.twig'),
          path.resolve('test/render/error-in-data/index.twig.data.js')
        ].sort());
        test.equal(renderResult.error.file, path.resolve('test/render/error-in-data/index.twig.data.js'));
        test.ok(renderResult.error.message);

        test.end();
      }
    );
  });

  test.test('should reject with file, message and dependencies on error in data dependency', function (test) {
    return plugin.render(path.resolve('test/render/error-in-data-dependency/index.twig')).then(
      function () {
        test.fail();

        test.end()
      },
      function (renderResult) {
        test.same(renderResult.sourceDependencies.sort(), [
          path.resolve('test/render/error-in-data-dependency/index.twig'),
          path.resolve('test/render/error-in-data-dependency/index.twig.data.js'),
          path.resolve('test/render/error-in-data-dependency/foo.js')
        ].sort());
        test.equal(renderResult.error.file, path.resolve('test/render/error-in-data-dependency/index.twig.data.js'));
        test.ok(renderResult.error.message);

        test.end();
      }
    );
  });

  test.test('should pass twig to data function', function (test) {
    return plugin.render(path.resolve('test/render/twig-to-data/index.twig')).then(
      function (renderResult) {
        test.ok(renderResult.binaries);

        let render = renderResult.binaries[0].data.toString();
        let expected = '<div class="bar">Dummy</div>';

        test.same(render, expected);

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    );
  });

  test.test('should support output config', function (test) {
    return plugin.render(path.resolve('test/render/basic/index.twig'), 'custom.html').then(
      function (renderResult) {
        let binaries = renderResult.binaries;

        test.equal(binaries[0].name, 'custom.html');

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    );
  });

  test.test('should support namespaces config', function (test) {
    let plugin = new Plugin({
      namespaces: {
        dummy: path.resolve('test/render/namespace/dummy')
      }
    });

    return plugin.render(path.resolve('test/render/namespace/index.twig')).then(
      function (renderResult) {
        test.ok(renderResult.binaries);

        let render = renderResult.binaries[0].data.toString();
        let wanted = '<div>partial-1</div><div>partial-2</div>';

        test.same(render, wanted);

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    );
  });

  test.test('should use a fresh twig instance', function (test) {
    return Promise.all([
      plugin.render(path.resolve('test/render/twig-fresh/first.twig')),
      plugin.render(path.resolve('test/render/twig-fresh/second.twig'))
    ]).then(function (results) {
      let firstResult = results[0].binaries[0].data;
      let secondResult = results[1].binaries[0].data;

      test.notOk(secondResult);

      test.end();
    });

    // return plugin.render(path.resolve('test/render/twig-fresh/first.twig')).then(
    //   function () {
    //     plugin.render(path.resolve('test/render/twig-fresh/second.twig')).then(
    //       function (result) {
    //         let data = result.data;
    //         let template = result.template;
    //
    //         let binary = template.render(data.data);
    //
    //         test.notOk(binary);
    //
    //         test.end();
    //       }
    //     )
    //   }
    // )
  });

  test.test('should resolve with binary dependencies', function (test) {
    return plugin.render(path.resolve('test/render/binary-dependencies/index.twig')).then(
      function (renderResult) {
        test.same(renderResult.binaryDependencies.sort(), [
          path.resolve('test/render/binary-dependencies/bar.png'),
          path.resolve('test/render/binary-dependencies/partial/foo.png')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    );
  });

  test.test('should render with external map', function (t) {
    let plugin = new Plugin({
      sourceMapEmbed: false
    });

    return plugin.render(path.resolve('test/render/map/index.twig')).then(
      function (renderResult) {
        t.equal(renderResult.sourceDependencies.length, 2);
        t.equal(renderResult.binaries.length, 2);
      },
      function (err) {
        t.fail(err);
      }
    );
  });

  test.test('should render with embedded map', function (t) {
    let plugin = new Plugin({
      sourceMapEmbed: true
    });

    return plugin.render(path.resolve('test/render/map/index.twig')).then(
      function (renderResult) {
        t.equal(renderResult.sourceDependencies.length, 2);
        t.equal(renderResult.binaries.length, 1);
      },
      function (err) {
        t.fail(err);
      }
    );
  });
});