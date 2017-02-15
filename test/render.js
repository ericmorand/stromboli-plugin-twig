const Plugin = require('../src/plugin');
const RenderResult = require('../node_modules/stromboli/lib/render-result.js');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var plugin = new Plugin();

test('render without data', function (t) {
  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/basic/index.twig'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 2);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/data/index.twig'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 3);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var awaited = '<div class="outer"><div class="inner">Lorem ipsum</div></div>';

      t.same(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with error', function (t) {
  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/error/index.twig'), renderResult).then(
    function(renderResult) {
      t.fail();
    },
    function(err) {
      t.pass(err);
    }
  );
});

test('render with data error', function (t) {
  // data file should be returned as a dependency even if it throws an exception
  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/data-error/index.twig'), renderResult).then(
    function(renderResult) {
      t.fail();
    },
    function(err) {
      t.equal(renderResult.getDependencies().size, 2);
    }
  );
});

test('render without output', function (t) {
  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/basic/index.twig'), renderResult).then(
    function(renderResult) {
      var binaries = renderResult.getBinaries();

      t.equal(binaries[0].name, 'index.html');
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with output', function (t) {
  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/basic/index.twig'), renderResult, 'custom.html').then(
    function(renderResult) {
      var binaries = renderResult.getBinaries();

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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/namespace/index.twig'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 3);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/data-as-function/index.twig'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 2);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var expected = '<div class="bar">Dummy</div>';

      t.same(render, expected);
    },
    function(err) {
      t.fail(err);
    }
  );
});