const Plugin = require('../src/plugin');
const fs = require('fs');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getBinaryDependencies', function (test) {
  test.plan(1);

  test.test('should resolve with binary dependencies', function (test) {
    let file = path.resolve('test/get-binary-dependencies/index.html');
    let data = fs.readFileSync(file);

    return plugin.getBinaryDependencies(data, file).then(
      function (results) {
        test.same(results.sort(), [
          'http://foo.bar/foo.png',
          path.resolve('test/get-binary-dependencies/foo/bar.png')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });
});