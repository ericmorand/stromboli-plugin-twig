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
    this.config = config || {};

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

    return this.getData(file).then(
      function (data) {
        return new Promise(function (fulfill, reject) {
          var twig = that.twig;

          twig.cache(false);

          try {
            twig.twig({
              path: file,
              namespaces: that.config.namespaces,
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

    let updateRenderResult = function (dependencies) {
      dependencies.forEach(function (dependency) {
        renderResult.dependencies.push(dependency);
      });
    };

    // retrieve dependencies and render the template
    return that.compile(file).then(
      function (result) {
        let data = result.data;
        let template = result.template;

        updateRenderResult(data.files);

        return Promise.all(
          [
            that.getDependencies(file).then(
              function (dependencies) {
                updateRenderResult(dependencies);

                return new Promise(function (fulfill, reject) {
                  try {
                    var binary = template.render(data.data);

                    renderResult.binaries.push({
                      name: output,
                      data: binary
                    });

                    fulfill(renderResult);
                  }
                  catch (err) {
                    renderResult.error = {
                      file: err.file,
                      message: err.message
                    };

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
        updateRenderResult([file]);

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
            error = {
              file: parent.filename,
              message: 'Cannot find module \'' + id + '\''
            };
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
                try {
                  data = data(that);
                }
                catch (err) {
                  reject({
                    file: dataFile,
                    message: err
                  });
                }
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

  getDependencies(file) {
    const Depper = require('twig-deps');

    let self = this;
    let dependencies = [];

    return new Promise(function (fulfill, reject) {
      let depper = new Depper();

      depper.namespaces = self.config.namespaces;

      depper.on('data', function (dep) {
        dependencies.push(dep);
      });

      depper.on('missing', function (dep) {
        dependencies.push(dep);
      });

      depper.on('error', function (err) {
        reject({
          dependencies: dependencies,
          error: {
            file: err.file,
            message: err.error
          }
        });
      });

      depper.on('finish', function () {
        fulfill(dependencies);
      });

      depper.end(file);
    });
  }
}

module.exports = Plugin;