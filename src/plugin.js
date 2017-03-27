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

        return Promise.all(
          [
            that.getDependencies(file).then(
              function (dependencies) {
                updateRenderResult(dependencies);

                return new Promise(function (fulfill, reject) {
                  try {
                    var binary = template.render(data);

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

  getDataPath(file) {
    return path.join(path.dirname(file), path.basename(file) + '.data.js');
  }

  getData(file) {
    var that = this;
    var dataFile = that.getDataPath(file);

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

          if (typeof data === 'function') {
            data = data(that);
          }

          return Promise.resolve(data).then(
            function (data) {
              fulfill(data);
            }
          );
        });
      },
      function () {
        return null;
      }
    );
  }

  getDependencies(file) {
    let self = this;

    let promises = [];
    let dependencies = [];

    // fetch twig template dependencies via twig-deps
    promises.push(new Promise(function (fulfill, reject) {
      const TwigDeps = require('twig-deps');

      let depper = new TwigDeps();

      depper.namespaces = self.config.namespaces;

      depper.on('data', function (dep) {
        dependencies.push(dep);
      });

      depper.on('missing', function (dep) {
        dependencies.push(dep);
      });

      depper.on('error', function () {
        // noop, we don't care but we have to catch this
      });

      depper.on('finish', function () {
        fulfill(dependencies);
      });

      depper.end(file);
    }));

    // fetch twig template data dependencies via module-deps
    promises.push(new Promise(function (fulfill, reject) {
      const ModuleDeps = require('module-deps');

      let dataFile = self.getDataPath(file);
      let depper = ModuleDeps({ignoreMissing: true});

      depper.on('data', function (data) {
        dependencies.push(data.id);
      });

      depper.on('missing', function (id, parent) {
        dependencies.push(id);
      });

      depper.on('end', function () {
        fulfill(dependencies);
      });

      depper.end({
        file: dataFile,
        entry: true
      });
    }));

    return Promise.all(promises).then(
      function () {
        return dependencies;
      }
    )
  }
}

module.exports = Plugin;