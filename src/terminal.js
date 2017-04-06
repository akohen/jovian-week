const player = require('./player.js')
const system = require('./system.js')
const commands = require('./commands/')

const options = {
  prompt: function(e) {
    e(`[[;green;]${player.status}]@[[;#777;]${player.ship.parent.name}]>`)
  },
  greetings: function(callback) {callback(`Welcome to Jovian Week ${player.name}`)},
  onBlur: function() { return false }, // prevent terminal from losing focus
  onAfterCommand: function(e) { system.save() },
  completion: function(string, callback) { //TODO add support for arguments autocomplete
    const suggestions = []
    for(let name in commands) {
      if(!commands[name].isAllowed || commands[name].isAllowed()) {
        suggestions.push(name)
      }
    }
    callback(suggestions)
  },
  //keydown: function(e, term) { if(game.blocked) return false;},
}

function interpreter(command,term) {
  const cmd = terminal.utils.parse_command(command)
    
  if( commands[cmd.name] ) {
    if( !commands[cmd.name].isAllowed || commands[cmd.name].isAllowed() ) {
      try {
        let value = commands[cmd.name].run(cmd.rest)
        return term.echo( value,{raw:/^<img src="([^"]+)">$/.test(value)} )  // Will set raw = true only for images
      } catch(e) {
        console.error(e)
        return term.error(e.toString())
      }
    }
  }

  return term.error("Command not recognized")
}


const terminal = { // Provides utils and main (instance), but only after initialization
  utils: null,
  main: null,
  start: function($) {
    $('#console').terminal(interpreter, options)
    this.main = $('#console').terminal()
    this.utils = $.terminal
  },
  run: function(command) { return interpreter(command, {echo:function(e) { return e }, error:function(e) { return e }} ) }, // used to test the interpreter
}

module.exports = terminal