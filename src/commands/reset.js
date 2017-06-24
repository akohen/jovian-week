const db = require('../db.js')
const location = require('../location.js')
const system = require('../system.js')

const command = {
  run: function() {
    db.universe.clear().then(() => {
      location.reset()
      system.save()
    })

    return `Game reset`
  },

  help: function() {
    return `Reset the game world`
  }
}

module.exports = command