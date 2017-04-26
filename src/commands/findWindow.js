const universe = require('../location.js').universe

const command = {
  run: function(cmd) {
    let args = require('../terminal.js').utils.parse_arguments(cmd)
    let target = universe[args[0]]
    if(!target) throw "Unknown target"

    console.log(target)
    console.log(universe.player)
    //let next = orbit.getNextWindow(universe.player.parent, target)

    return 12
  },

  help: function(opts) {
    return '<target body> Finds the next transfer window from the current position to the selected celestial body'
  },
}

module.exports = command