const db = require('../db.js')
const location = require('../location.js')

const command = {
  run: function(cmd) {
    location.reset();

    return cmd
  },

  help: function() {
    return `Reset the game world`
  }
}

module.exports = command