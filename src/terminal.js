const player = require('./player.js')
const system = require('./system.js')
const commands = require('./commands/')

const options = {
  prompt: function(e) {e(`[[;green;]${player.status}]@[[;#777;]${player.location}]>`)},
  greetings: function(callback) {callback(`Welcome to Jovian Week ${player.name}`)},
  onBlur: function() { return false },
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
        return term.echo( commands[cmd.name].run(cmd.rest) )
      } catch(e) {
        console.error(e)
        return term.error(e.toString())
      }
    }
  }

  term.error("Command not recognized")
}


const terminal = {} // Provides utils and main (instance), but only after initialization

jQuery(document).ready(function($) {
  $('#console').terminal(interpreter, options)
  system.load()
  system.update()
  terminal.utils = $.terminal
  terminal.main = $('#console').terminal()
})


module.exports = terminal