const fs = require('fs-extra');
const path = require('path');

const Promise = require('promise');
const fsStat = Promise.denodeify(fs.stat);

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
  }

  compile(file) {
    var that = this;

    return new Promise(function (fulfill, reject) {
      var twig = that.twig;

      twig.cache(false);

      try {
        twig.twig({
          path: file,
          namespaces: that.config ? that.config.namespaces : null,
          rethrow: true,
          async: false, // todo: use async when it's fixed in twigjs, @see node_modules/twig/twig.js:5397
          load: function (template) {
            fulfill(template)
          }
        });
      }
      catch (err) {
        reject({
          file: file,
          message: err.message
        });
      }
    });
  }

  /**
   *
   * @param file {String}
   * @param output {String}
   * @returns {Promise}
   */
  render(file, output) {
    var that = this;

    if (!output) {
      output = 'index.html';
    }

    let renderResult = {
      binaries: [],
      dependencies: [],
      error: null
    };

    // retrieve dependencies and render the template
    return that.compile(file).then(
      function (template) {
        let updateRenderResult = function (dependencies) {
          dependencies.forEach(function (dependency) {
            renderResult.dependencies.push(dependency);
          });
        };

        return Promise.all(
          [
            that.getDependencies(template).then(
              function (dependencies) {
                updateRenderResult(dependencies);

                return renderResult;
              },
              function (result) {
                updateRenderResult(result.dependencies);

                renderResult.error = result.error;

                return Promise.reject(renderResult);
              }
            ),
            that.getData(template).then(
              function (result) {
                result.files.forEach(function (file) {
                  renderResult.dependencies.push(file);
                });

                var binary = template.render(result.data);

                renderResult.binaries.push({
                  name: output,
                  data: binary
                });

                return renderResult;
              },
              function (err) {
                renderResult.error = err;

                return Promise.reject(renderResult);
              }
            )
          ]
        ).then(
          function () {
            return renderResult;
          }
        )
      },
      function (err) {
        renderResult.error = err;

        return Promise.reject(renderResult);
      }
    )
  }

  getData(template) {
    var that = this;
    var file = template.path;
    var extension = path.extname(file);
    var dataFile = path.join(path.dirname(file), path.basename(file, extension) + '.data.js');

    var result = {
      files: [],
      data: null
    };

    return that.exists(dataFile).then(
      function () {
        return new Promise(function (fulfill, reject) {
          var deleteRequireCache = function (id) {
            var files = require.cache[id];
            if (typeof files !== 'undefined') {
              for (var i in files.children) {
                deleteRequireCache(files.children[i].id);
              }

              delete require.cache[id];
            }
          };

          deleteRequireCache(dataFile);

          try {
            var data = require(dataFile);
          }
          catch (err) {
            reject({
              file: dataFile,
              message: err
            });
          }

          var mdeps = require('module-deps');

          var md = mdeps();

          md.on('data', function (data) {
            result.files.push(data.id);
          });

          md.on('end', function () {
            result.files.reverse();

            if (typeof data === 'function') {
              data = data(that);
            }

            return Promise.resolve(data).then(
              function (data) {
                result.data = data;

                fulfill(result);
              }
            );
          });

          md.end({
            file: dataFile,
            entry: true
          });
        });
      },
      function () {
        return result;
      }
    );
  }

  getDependencies(template) {
    var that = this;

    var resolveDependencies = function (_template, _results) {
      var promises = [];

      var processToken = function (token, promises) {
        if (token.type == 'logic') {
          token = token.token;

          switch (token.type) {
            case 'Twig.logic.type.include':
            case 'Twig.logic.type.import': {
              var stack = token.stack;

              stack.forEach(function (stackEntry) {
                switch (stackEntry.type) {
                  case 'Twig.expression.type.string':
                    var dep = that.twig.path.parsePath(_template, stackEntry.value);

                    try {
                      fs.statSync(dep);

                      if (_results.indexOf(dep) < 0) {
                        promises.push(that.compile(dep).then(
                          function (__template) {
                            return resolveDependencies(__template, _results);
                          }
                        ))
                      }
                    }
                    catch (err) {
                      promises.push(Promise.reject({
                        file: dep,
                        message: err.message
                      }));
                    }

                    break;
                }
              });

              break;
            }
            case 'Twig.logic.type.for':
            case 'Twig.logic.type.macro':
            case 'Twig.logic.type.setcapture': {
              token.output.forEach(function (token) {
                processToken(token, promises);
              });

              break;
            }
          }
        }
      };

      _results.push(_template.path);

      _template.tokens.forEach(function (token) {
        processToken(token, promises);
      });

      return Promise.all(promises);
    };

    var results = [];

    return resolveDependencies(template, results).then(
      function () {
        return results;
      },
      function (err) {
        return Promise.reject({
          dependencies: results,
          error: err
        });
      }
    );
  }
}

module.exports = Plugin;