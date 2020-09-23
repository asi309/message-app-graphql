const fs = require('fs');
const path = require('path');

module.exports = {
  clearImage: (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, (err) => console.log(err));
  },
};
