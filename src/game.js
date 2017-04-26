const game = { // quick access to modules
  system: require('./system.js'),
  terminal: require('./terminal.js'),
  time: require('./utils/time.js'),
  player: require('./player.js'),
  commands: require('./commands/'),
  location: require('./location.js'),
  db: require('./db/'),
  data: require('./data.js'),
}

game.system.load().then( () => {
  game.system.update()
  game.terminal.start($)
})

window.jovianWeek = game // for debugging purposes
window.u = game.location.universe
window.t = game.time
window.Body = require('./utils/body.js')