var Promise = require('promise');

var otherData = require('./other.data.js');

module.exports = Promise.resolve(otherData).then(
  function(data)  {
    return {
      content: "Lorem ipsum",
      otherData: data
    };
  }
);

