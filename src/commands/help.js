
const command = {
  run: function(cmd) {
    let commands = require('./')
    let args = require('../terminal.js').utils.parse_arguments(cmd)

    if(args[0]) { // Is there a specified command ?
      let name = args[0]
      if( commands[name] // Does the command exist ?
        && (!commands[name].isAllowed || commands[name].isAllowed() )) { // Is it allowed ?
          if(commands[name].help) return commands[name].help(cmd)
          else return `The command has no help page`
      }
      return `The command is not recognized`
    }


    let val = `Hello`
    for(let name in commands) {
      if(!commands[name].isAllowed || commands[name].isAllowed()) {
        val += `\n  [[b;;]${name}] `
        if(commands[name].help) val += commands[name].help('list')
      }
    }
    return val
  },


}

module.exports = command