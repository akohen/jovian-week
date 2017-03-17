const location = require('../location.js')

const command = {
  run: function() {
    let ship = location.universe.player
    return `Currently orbiting ${ship.parent.name}
Semi-major axis: ${location.getFormattedDistance(ship.sma)}
Fuel level: 100%
Hull integrity: 100%
No transfer in progress`
  },

  help: function() {
    return `display information about the ship's current situation`
  }
}

module.exports = command