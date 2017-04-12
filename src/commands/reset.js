const db = require('../db.js')
const data = require('../data.js')
const location = require('../location.js')

const command = {
  run: function(cmd) {
    location.reset();
    data.reset();
    location.import(data.solarSystem);

    return cmd
  },

  help: function() {
    return `Reset the game world`
  }
}

module.exports = command