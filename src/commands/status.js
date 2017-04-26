const location = require('../location.js')
const time = require('../utils/time.js')

const command = {
  run: function() {
    let ship = location.universe.player
    return `Currently orbiting ${ship.parent.name}
Semi-major axis: ${location.getFormattedDistance(ship.sma)}
Fuel level: 100%
Hull integrity: 100%
No transfer in progress
Next Apoapsis in [[;red;]${time.getRemainingTime(ship.tAp)}] - Next Periapsis in [[;red;]${time.getRemainingTime(ship.tPe)}] - Orbital period [[;red;]${time.timeToString(ship.T)}]`
  },

  help: function() {
    return `display information about the ship's current situation`
  }
}

module.exports = command