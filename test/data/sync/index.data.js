var path = require('path');
var otherDataFile = path.resolve(path.join(__dirname, 'other.data.js'));

var otherData = require(otherDataFile);

module.exports = {
  deps: [otherDataFile].concat(otherData.deps),
  data: {
    content: "Lorem ipsum",
    otherData: otherData.data
  }
};