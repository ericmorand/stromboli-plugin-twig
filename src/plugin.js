const fs = require('fs-extra');
const path = require('path');
const requireUncached = require('require-uncached');

const Promise = require('promise');
const fsStat = Promise.denodeify(fs.stat);

class Plugin {
  /**
   *
   * @param config {Object}
   */
  constructor(config) {
    this.config = config;

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

  compile(file, fetchData) {
    var that = this;
    var promise = null;

    if (fetchData) {
      promise = this.getData(file);
    }
    else {
      promise = Promise.resolve(true);
    }

    return promise.then(
      function (data) {
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
                fulfill({
                  data: data,
                  template: template
                })
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
    );
  }

  /**
   *
   * @param file {String}
   * @param output {String}
   * @returns {Promise}
   */
  render(file, output) {
    var that = this;

    that.twig = requireUncached('twig');

    if (!output) {
      output = 'index.html';
    }

    let renderResult = {
      binaries: [],
      dependencies: [],
      error: null
    };

    // retrieve dependencies and render the template
    return that.compile(file, true).then(
      function (result) {
        let data = result.data;
        let template = result.template;

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

                return new Promise(function (fulfill, reject) {
                  updateRenderResult(data.files);

                  try {
                    var binary = template.render(data.data);

                    renderResult.binaries.push({
                      name: output,
                      data: binary
                    });

                    fulfill(renderResult);
                  }
                  catch (err) {
                    reject(renderResult);
                  }
                });
              },
              function (result) {
                updateRenderResult(result.dependencies);

                renderResult.error = result.error;

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

  getData(file) {
    var that = this;
    var dataFile = path.join(path.dirname(file), path.basename(file) + '.data.js');

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

          var md = require('module-deps')({
            ignoreMissing: true
          });

          md.on('data', function (data) {
            result.files.push(data.id);
          });

          var error = null;

          md.on('missing', function (id, parent) {
            if (!error) {
              error = {
                file: parent.filename,
                message: 'Cannot find module \'' + id + '\''
              };
            }
          });

          md.on('end', function () {
            if (error) {
              reject(error);
            }
            else {
              try {
                var data = require(dataFile);
              }
              catch (err) {
                reject({
                  file: dataFile,
                  message: err
                });
              }

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
            }
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
    var dependencies = [];

    var resolveDependencies = function (_template) {
      dependencies.push(_template.path);

      var processToken = function (token) {
        if (token.type == 'logic') {
          token = token.token;

          switch (token.type) {
            case 'Twig.logic.type.include':
            case 'Twig.logic.type.import': {
              var stack = token.stack;

              return Promise.all(stack.map(function (stackEntry) {
                switch (stackEntry.type) {
                  case 'Twig.expression.type.string':
                    var dep = that.twig.path.parsePath(_template, stackEntry.value);

                    try {
                      fs.statSync(dep);

                      if (dependencies.indexOf(dep) < 0) {
                        return that.compile(dep).then(
                          function (result) {
                            return resolveDependencies(result.template);
                          }
                        )
                      }
                    }
                    catch (err) {
                      return true;
                    }

                    break;
                }
              }));
            }
            case 'Twig.logic.type.for':
            case 'Twig.logic.type.macro':
            case 'Twig.logic.type.setcapture': {
              return Promise.all(token.output.map(processToken));
            }
          }
        }
      };

      return Promise.all(_template.tokens.map(processToken));
    };

    return resolveDependencies(template).then(
      function () {
        return dependencies;
      },
      function (err) {
        return Promise.reject({
          dependencies: dependencies,
          error: err
        });
      }
    );
  }
}

module.exports = Plugin;