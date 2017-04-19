const location = require('../../location.js')
const orbit = require('../../utils/orbit.js')
const time = require('../../utils/time.js')

// usage map target (default player)
const command = {
  run: function(cmd) {
    const player = location.universe.player
    if(player.eccentricity < 0.01) throw "Orbit is already circular";
    if(player.maneuvers) throw "Can't plan this until the last maneuver has been executed";
    const maneuver = {eccentricity:0}
    const tAp = orbit.tAp(player)
    const tPe = orbit.tPe(player)

    // select point for maneuver and circularization altitude
    // We'll keep the argument of periapsis constant after maneuver, so we only need to update the mean anomaly at epoch
    if(cmd.toUpperCase() == "AP" | (cmd == "" && tAp < tPe) ) {
      maneuver.epoch = tAp
      maneuver.sma = orbit.Ap(player)
      maneuver.anomalyAtEpoch = Math.PI
    } else if(cmd.toUpperCase() == "PE" | (cmd == "" && tAp > tPe) ) {
      maneuver.epoch = tPe
      maneuver.sma = orbit.Pe(player)
      maneuver.anomalyAtEpoch = 0
    } else {
      throw "Incorrect argument, expecting 'AP' 'PE' or empty "
    }

    // Push them to the player stack
    try {
      location.addManeuver(player,maneuver)
      return `Successfully planned circularization maneuver in ${time.getRemainingTime(maneuver.epoch)}`
    } catch(e) {
      throw "Couldn't plan maneuver : " + e
    }
    

  },

  help: function() {
    return `<AP|PE> Will circularize the orbit at the specified point, or at the next apside if none is specified`
  }
}

module.exports = command