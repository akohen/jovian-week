const universe = require('./location.js').universe

class Player {
  get name() { return "jed" }
  get status() { return "orbiting" }
  get deltav() { return 100 }
  get ship() { return universe.player }
  get balance() { return 100 }
  get hull() { return 100 }
}

const player = new Player()

module.exports = player