var StromboliPlugin = require('stromboli-plugin');
var fs = require('fs-extra');
var path = require('path');

var Promise = require('promise');
var readJSON = Promise.denodeify(fs.readJSON);

class Plugin extends StromboliPlugin {
  /**
   *
   * @param config {Object}
   * @param name {String}
   * @param entry {String}
   */
  constructor(config, name, entry) {
    super(config, name, entry);

    this.twig = require('twig');
  }

  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @returns {Promise}
   */
  render(file, renderResult) {
    var that = this;

    // retrieve dependencies and render the template
    return Promise.all([
      that.getDependencies(file).then(
        function (dependencies) {
          dependencies.forEach(function (dependency) {
            renderResult.addDependency(dependency);
          });
        }
      ),
      that.readFile(file).then(
        function () {
          return that._twig(file).then(
            function (template) {
              return that.getTemplateData(file).then(
                function (result) {
                  result.files.forEach(function (file) {
                    renderResult.addDependency(file);
                  });

                  var binary = template.render(result.data);

                  renderResult.addBinary('index.html', binary);
                }
              );
            }
          )
        }
      )
    ]).then(
      function () {
        return renderResult;
      }
    );
  }

  getTemplateData(file) {
    var that = this;
    var extension = path.extname(file);
    var dataFile = path.join(path.dirname(file), path.basename(file, extension) + '.json');

    var result = {
      files: [],
      data: null
    };

    return that.exists(dataFile).then(
      function () {
        return readJSON(dataFile).then(
          function (data) {
            result.files.push(dataFile);
            result.data = data;

            return result;
          }
        )
      },
      function () {
        return result;
      }
    );
  }

  /**
   *
   * @param file
   * @returns {Promise}
   * @private
     */
  _twig(file) {
    var that = this;

    return new Promise(function (fulfill, reject) {
      var twig = that.twig;

      twig.cache(false);

      try {
        twig.twig({
          path: file,
          rethrow: true,
          async: false, // todo: use async when it's fixed in twigjs, @see node_modules/twig/twig.js:5397
          load: function (template) {
            fulfill(template)
          }
        });
      }
      catch (err) {
        reject(err);
      }
    });
  }

  getDependencies(file) {
    var that = this;

    var resolveDependencies = function (_file, _results) {
      return that.exists(_file).then(
        function () {
          return that._twig(_file).then(
            function (template) {
              var promises = [];

              _results.push(_file);

              template.tokens.forEach(function (token) {
                if (token.type == 'logic') {
                  token = token.token;

                  if (token.type == 'Twig.logic.type.include') {
                    var stack = token.stack;

                    stack.forEach(function (stackEntry) {
                      var dep = path.resolve(path.dirname(_file), stackEntry.value);

                      if (_results.indexOf(dep) < 0) {
                        promises.push(resolveDependencies(dep, _results))
                      }
                    });
                  }
                }
              });

              return Promise.all(promises);
            }
          );
        },
        function () {
          return true;
        }).then(
        function () {
          return _results;
        }
      );
    };

    return resolveDependencies(file, []);
  }
}

module.exports = Plugin;