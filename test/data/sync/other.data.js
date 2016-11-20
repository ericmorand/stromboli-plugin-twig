var path = require('path');
var otherDataFile = path.resolve(path.join(__dirname, 'sub/index.data.js'));

var otherData = require(otherDataFile);

module.exports = {
  deps: [otherDataFile].concat(otherData.deps),
  data: {
    content: "Dolor sit amet",
    otherData: otherData.data
  }
};