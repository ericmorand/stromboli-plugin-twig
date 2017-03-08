const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var plugin = new Plugin();

test('render without data', function (t) {
  t.plan(3);

  return plugin.render(path.resolve('test/render/basic/index.twig')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 2);
      t.equal(renderResult.binaries.length, 1);

      var render = renderResult.binaries[0].data;
      var awaited = fs.readFileSync(path.resolve('test/render/basic/index.html')).toString();

      t.equal(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with data', function (t) {
  t.plan(3);

  return plugin.render(path.resolve('test/render/data/index.twig')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 3);
      t.equal(renderResult.binaries.length, 1);

      var render = renderResult.binaries[0].data;
      var awaited = '<div class="outer"><div class="inner">Lorem ipsum</div></div>';

      t.same(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with error', function (t) {
  return plugin.render(path.resolve('test/render/error/index.twig')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 0);
    }
  );
});

test('render with error in partial', function (t) {
  return plugin.render(path.resolve('test/render/error-in-partial/index.twig')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 1);
    }
  );
});

test('render with missing partial', function (t) {
  return plugin.render(path.resolve('test/render/missing-partial/index.twig')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 1);
    }
  );
});

test('render with data error', function (t) {
  return plugin.render(path.resolve('test/render/data-error/index.twig')).then(
    function() {
      t.fail();
    },
    function() {
      t.pass();
    }
  );
});

test('render without output', function (t) {
  t.plan(1);

  return plugin.render(path.resolve('test/render/basic/index.twig')).then(
    function(renderResult) {
      var binaries = renderResult.binaries;

      t.equal(binaries[0].name, 'index.html');
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with output', function (t) {
  t.plan(1);

  return plugin.render(path.resolve('test/render/basic/index.twig'), 'custom.html').then(
    function(renderResult) {
      var binaries = renderResult.binaries;

      t.equal(binaries[0].name, 'custom.html');
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with namespaces', function (t) {
  t.plan(3);

  var plugin = new Plugin({
    namespaces: {
      dummy: path.resolve('test/render/namespace/dummy')
    }
  });

  return plugin.render(path.resolve('test/render/namespace/index.twig')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 3);
      t.equal(renderResult.binaries.length, 1);

      var render = renderResult.binaries[0].data;
      var expected = '<div>partial-1</div><div>partial-2</div>';

      t.same(render, expected);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with data as function', function (t) {
  t.plan(3);

  return plugin.render(path.resolve('test/render/data-as-function/index.twig')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 2);
      t.equal(renderResult.binaries.length, 1);

      var render = renderResult.binaries[0].data;
      var expected = '<div class="bar">Dummy</div>';

      t.same(render, expected);
    },
    function(err) {
      t.fail(err);
    }
  );
});