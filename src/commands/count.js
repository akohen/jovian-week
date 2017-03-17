let total = 0

const command = {
  run: function(cmd) {
    return `This command has been run ${total++} times`
  }
}

module.exports = command