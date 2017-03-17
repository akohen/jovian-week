
const command = {
  run: function(cmd) {

    let args = require('../terminal.js').utils.parse_arguments(cmd)
    let value = 0
    for(let n of args) {
      if(isNaN(n)) throw "Not a number"
      value += n
    }
    return value
  }
}

module.exports = command