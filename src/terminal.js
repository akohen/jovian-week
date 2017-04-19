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

  function isAllowed(command) {
    if( !commands[command] ) return false;
    if( commands[command].isAllowed && !commands[command].isAllowed() ) return false;
    return true;
  }

  function getArgs(command, result) {
    if(!command) return result;
    if(!result) return command;
    return command + " " + result;
  }

  function isRaw(result) {
    return /^<img src="([^"]+)">$/.test(result); // Will set raw = true only for images
  }

  const segments = command.split(' | ');
  let result = "";

  for(let i=0; i<segments.length; i++) {
    let segment = terminal.utils.parse_command(segments[i]);
    if (isAllowed(segment.name)) {
      try {
        result = commands[segment.name].run( getArgs(segment.rest, result) )
      } catch(e) {
        console.error(e)
        return term.error(e.toString())
      }      
    } else {
      return term.error("Command not recognized");
    }
  }

  return term.echo( result,{raw:isRaw(result)} ); 
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