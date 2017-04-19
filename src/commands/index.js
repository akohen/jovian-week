const commands = {
  add: require('./add.js'),
  both: require('./both.js'),
  circularize: require('./maneuver/circularize.js'),
  count: require('./count.js'),
  echo: require('./echo.js'),
  find_window: require('./findWindow.js'),
  forbidden: require('./forbidden.js'),
  format_time: require('./formatTime.js'),
  help: require('./help.js'),
  map: require('./mapping/map.js'),
  log: require('./log.js'),
  reset: require('./reset.js'),
  status: require('./status.js'),
}

module.exports = commands