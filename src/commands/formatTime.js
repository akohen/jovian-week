const time = require('../utils/time.js')

const command = {
  run: function(cmd) {
    if(isNaN(cmd)) throw "Not a number"

    return time.timeToString(cmd)
  },

  help: function(opts) {
    return '<time in seconds> Returns a formatted time string'
  },
}

module.exports = command