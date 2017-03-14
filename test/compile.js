const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

var plugin = new Plugin({}, 'twig', 'index.twig');

tap.test('compile', function (test) {
  test.plan(1);

  var plugin = new Plugin({});

  test.test('should use a fresh twig instance', function(t) {
    plugin.compile(path.resolve('test/compile/first.twig')).then(
      function() {
        plugin.compile(path.resolve('test/compile/second.twig')).then(
          function(result) {
            let data = result.data;
            let template = result.template;

            let binary = template.render(data.data);

            t.notOk(binary);

            t.end();
          }
        )
      }
    )
  });
});