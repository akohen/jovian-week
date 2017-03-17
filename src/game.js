const game = { // quick access to modules
  system: require('./system.js'),
  orbit: require('./utils/orbit.js'),
  terminal: require('./terminal.js'),
  time: require('./utils/time.js'),
  player: require('./player.js'),
  commands: require('./commands/'),
  location: require('./location.js'),
  db: require('./db/'),
}

window.jovianWeek = game
module.exports = game