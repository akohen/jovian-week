const log = require('./log.js')

const command = {
  run: function(cmd) {
    log.run(cmd)
    return cmd
  },

  help: function() {
    return `Return and log the arguments`
  }
}

module.exports = command