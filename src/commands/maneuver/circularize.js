const location = require('../../location.js')
const orbit = require('../../utils/orbit.js')

// usage map target (default player)
const command = {
  run: function(cmd) {
    const player = location.universe.player
    const maneuver = {eccentricity:0}
    // select point for maneuver and circularization altitude
    if(cmd == "AP") {
      
    } else if(cmd == "PE") {

    } else {

    }

    // Define new orbital elements

    // Push them to the player stack
  },

  help: function() {
    return `<AP|PE> Will circularize the orbit at the specified point, or at the next apside if none is specified`
  }
}

module.exports = command