'use strict';
let fs = require('fs');
function formatMessage(duration){
  let date = (new Date()).toISOString().substring(0, 19).replace('T', ' ');
  return `${date} ${Math.floor(duration/1000)}`;
}
module.exports = {
  log: function(duration){
    let msg = formatMessage(duration);
    fs.appendFile('log.txt', `${msg}\n`, (err) => {
      if (err) throw err;
    });
  }
};
