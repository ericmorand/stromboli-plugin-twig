var Promise = require('promise');

var otherData = require('./sub/index.data.js');

module.exports = Promise.resolve(otherData).then(
  function(data) {
    return {
      content: "Dolor sit amet",
      otherData: data
    };
  }
);