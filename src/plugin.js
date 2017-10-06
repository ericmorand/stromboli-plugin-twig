const fs = require('fs-extra');
const path = require('path');
const requireUncached = require('require-uncached');

const Rebaser = require('html-source-map-rebase');
const Readable = require('stream').Readable;
const through = require('through2');

const Promise = require('promise');
const fsStat = Promise.denodeify(fs.stat);

class Plugin {
  /**
   *
   * @param config {Object}
   */
  constructor(config) {
    this.config = config || {};

    this.config.sourceMap = true;
    this.config.rethrow = true;
    this.config.async = false;

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

    /**
     *
     * @param file
     * @param twig
     * @returns {Twig.Template|*}
     * @private
     */
    this._compile = function (file, twig) {
      twig.cache(false);

      this.config.path = file;

      return twig.twig(this.config);
    };
  }

  compile(file, twig) {
    var that = this;

    return this.getData(file, twig).then(
      function (data) {
        return new Promise(function (fulfill, reject) {
          try {
            fulfill({
              data: data,
              template: that._compile(file, twig)
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

    let twig = requireUncached('twing');

    if (!output) {
      output = 'index.html';
    }

    let renderResult = {
      binaries: [],
      binaryDependencies: [],
      sourceDependencies: [],
      error: null
    };

    // @todo: useless until twing supports it
    // this.twigConfig.outFile = output;

    // retrieve dependencies and render the template
    return that.getDependencies(file).then(
      function (dependencies) {
        renderResult.sourceDependencies = dependencies;

        return that.compile(file, twig).then(
          function (result) {
            let data = result.data;
            let template = result.template;

            return new Promise(function (fulfill, reject) {
              try {
                fulfill(template.render(data));
              }
              catch (err) {
                reject({
                  file: err.file,
                  message: err.message
                });
              }
            })
          }
        )
      }
    ).then(
      function (twingRenderResult) {
        return new Promise(function (fulfill, reject) {
          let binary = '';

          let rebaser = new Rebaser({
            map: twingRenderResult.sourceMap
          });

          rebaser.on('rebase', function (rebased) {
            rebased = path.join(path.dirname(file), rebased);

            if (renderResult.binaryDependencies.indexOf(rebased) < 0) {
              renderResult.binaryDependencies.push(rebased);
            }
          });

          let stream = new Readable();

          stream
            .pipe(rebaser)
            .pipe(through(function (chunk, enc, cb) {
              binary = chunk;

              cb();
            }))
            .on('finish', function () {
              renderResult.binaries.push({
                name: output,
                data: binary
              });

              if (!that.config.sourceMapEmbed) {
                renderResult.binaries.push({
                  name: output + '.map',
                  data: twingRenderResult.sourceMap
                });
              }

              fulfill(renderResult);
            });

          stream.push(twingRenderResult.markup);
          stream.push(null);
        });
      },
      function (error) {
        renderResult.error = error;

        return Promise.reject(renderResult);
      }
    );
  }

  getDataPath(file) {
    return path.join(path.dirname(file), path.basename(file) + '.data.js');
  }

  /**
   *
   * @param file
   * @param twig
   * @returns {Promise.<{}>}
   */
  getData(file, twig) {
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

          let nh = require('node-hook');

          nh.hook('.twig', function (source, filename) {
            return `module.exports = '${filename}';`;
          });

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
            try {
              data = data({
                twig: twig,
                render: function (file, data) {
                  let template = that._compile(file, twig);

                  return template.render(data);
                }
              });
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

  getDataDependencies(file) {
    let self = this;

    return new Promise(function (fulfill, reject) {
      const ModuleDeps = require('module-deps');

      let depper = ModuleDeps({ignoreMissing: true});

      let dependencies = [];
      let twigPromises = [];

      let updateDependencies = function (file) {
        if (dependencies.indexOf(file) < 0) {
          dependencies.push(file);
        }
      };

      depper.on('file', function (file) {
        updateDependencies(file);
      });

      depper.on('data', function (data) {
        let file = data.id;

        if (path.extname(file) === '.twig') {
          twigPromises.push(self.getTwigDependencies(file).then(
            function (results) {
              results.forEach(function (result) {
                updateDependencies(result);

                return result;
              });
            }
          ));
        }
        else {
          updateDependencies(file);
        }
      });

      depper.on('missing', function (id, parent) {
        if (path.extname(id).length === 0) {
          let candidates = [
            `${id}.js`,
            `${id}/index.js`
          ];

          candidates.forEach(function (candidate) {
            dependencies.push(path.resolve(parent.basedir, candidate));
          });
        }
        else {
          dependencies.push(path.resolve(parent.basedir, id));
        }
      });

      depper.on('end', function () {
        Promise.all(twigPromises).then(
          function () {
            fulfill(dependencies);
          }
        );
      });

      depper.on('error', function (err) {
        fulfill(dependencies);
      });

      depper.end({
        file: file,
        entry: true
      });
    })
  };

  getTwigDependencies(file) {
    let self = this;
    let dependencies = [];

    return new Promise(function (fulfill, reject) {
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
    })
  };

  getDependencies(file) {
    let self = this;

    let promises = [];

    promises.push(self.getTwigDependencies(file));
    promises.push(self.getDataDependencies(self.getDataPath(file)));

    return Promise.all(promises).then(
      function (results) {
        return [].concat.apply([], results);
      }
    )
  }
}

module.exports = Plugin;