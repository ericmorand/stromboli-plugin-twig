const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

tap.test('constructor', function (test) {
  test.plan(1);

  test.test('should support no config', function(test) {
    let plugin = new Plugin();

    test.same(plugin.config, {});

    test.end();
  });
});