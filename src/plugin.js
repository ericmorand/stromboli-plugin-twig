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
        reject(err);
      }
    });
  }

  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @param output {String}
   * @returns {Promise}
   */
  render(file, renderResult, output) {
    var that = this;

    if (!output) {
      output = 'index.html';
    }

    // retrieve dependencies and render the template
    return that.compile(file).then(
      function (template) {
        return Promise.all(
          [
            that.getDependencies(template).then(
              function (dependencies) {
                dependencies.forEach(function (dependency) {
                  renderResult.addDependency(dependency);
                });

                return renderResult;
              }
            ),
            that.getData(template).then(
              function (result) {
                result.files.forEach(function (file) {
                  renderResult.addDependency(file);
                });

                var binary = template.render(result.data);

                renderResult.addBinary(output, binary);

                return renderResult;
              },
              function (result) {
                renderResult.addDependency(result.file);

                return Promise.reject(result.err);
              }
            )
          ]
        ).then(
          function () {
            return renderResult;
          }
        )
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
              err: err,
              file: dataFile
            });
          }

          var mdeps = require('module-deps');

          var md = mdeps({
            postFilter: function (id, file, pkg) {
              // remove external dependencies
              var regexp = process.platform === 'win32' ? /^(\.|\w:)/ : /^[\/.]/;

              return regexp.test(id);
            }
          });

          md.on('data', function (data) {
            result.files.push(data.id);
          });

          md.on('end', function (d) {
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
                var dep = that.twig.path.parsePath(_template, stackEntry.value);

                if (_results.indexOf(dep) < 0) {
                  promises.push(that.compile(dep).then(
                    function (__template) {
                      return resolveDependencies(__template, _results);
                    },
                    function (err) {
                      // we don't care if the file could not be compiled into a template
                    }
                  ))
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
      }
    );
  }
}

module.exports = Plugin;