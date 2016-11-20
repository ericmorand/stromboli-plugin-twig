const fs = require('fs-extra');
const path = require('path');

const Promise = require('promise');
const fsStat = Promise.denodeify(fs.stat);
const fsReadFile = Promise.denodeify(fs.readFile);
const required = Promise.denodeify(require('required'));

class Plugin {
  /**
   *
   * @param config {Object}
   */
  constructor(config) {
    this.config = config;
    this.twig = require('twig');

    /**
     *
     * @param path {String}
     * @returns {Promise}
     */
    this.exists = function (path) {
      return fsStat(path).then(
        function () {
          return path;
        },
        function (e) {
          return Promise.reject(e);
        }
      )
    };

    this._twig = function (file) {
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
    };
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
      fsReadFile(file).then(
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
    var dataFile = path.join(path.dirname(file), path.basename(file, extension) + '.data.js');

    var result = {
      files: [],
      data: null
    };

    return that.exists(dataFile).then(
      function () {
        delete require.cache[dataFile];

        var data = require(dataFile);

        return Promise.resolve(data).then(
          function (data) {
            result.files.push(dataFile);

            if (data.data && data.deps) {
              result.data = data.data;
              result.files = result.files.concat(data.deps);
            }
            else {
              result.data = data;
            }

            return result;
          }
        );
      },
      function () {
        return result;
      }
    );
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

              var processToken = function(token, promises) {
                if (token.type == 'logic') {
                  token = token.token;

                  switch (token.type) {
                    case 'Twig.logic.type.include': {
                      var stack = token.stack;

                      stack.forEach(function (stackEntry) {
                        var dep = path.resolve(path.dirname(_file), stackEntry.value);

                        if (_results.indexOf(dep) < 0) {
                          promises.push(resolveDependencies(dep, _results))
                        }
                      });

                      break;
                    }
                    case 'Twig.logic.type.for': {
                      token.output.forEach(function(token) {
                        processToken(token, promises);
                      });

                      break;
                    }
                  }
                }
              };

              template.tokens.forEach(function (token) {
                processToken(token, promises);
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