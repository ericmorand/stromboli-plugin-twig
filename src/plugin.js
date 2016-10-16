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

    return new Promise(function (fulfill, reject) {
      return that.readFile(file).then(
        function (readResult) {
          var twig = that.twig;
          return that.getDependencies(file).then(
            function(dependencies) {
              dependencies.forEach(function(dependency) {
                renderResult.addDependency(dependency);
              });

              twig.cache(false);
              twig.twig({
                path: file,
                rethrow: true,
                load: function (template) {
                  return that.getTemplateData(file).then(
                    function (result) {
                      result.files.forEach(function (file) {
                        renderResult.addDependency(file);
                      });

                      try {
                        var binary = template.render(result.data);

                        renderResult.addBinary('index.html', binary);

                        fulfill(renderResult);
                      }
                      catch (err) {
                        var error = {
                          file: null,
                          message: err
                        };

                        reject(error);
                      }
                    }
                  );
                },
                error: function (err) {
                  var error = {
                    file: file,
                    message: err
                  };

                  reject(error);
                }
              });
            }
          );
        }
      );
    });
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

  getDependencies(file) {
    var that = this;
    var twig = that.twig;

    var resolveDependencies = function(_file, _results) {
      return that.exists(_file).then(
        function () {
          return new Promise(function (fulfill, reject) {
              twig.twig({
                path: _file,
                rethrow: true,
                load: function (template) {
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

                  fulfill(Promise.all(promises));
                }
              });
            }
          )
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