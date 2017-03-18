const orbit = require('../utils/orbit.js')
const location = require('../location.js')

function drawBody(ctx, body) {
  ctx.fillStyle = '#f00';
  ctx.fillRect(20,10,80,50)
}

const command = {
  run: function(cmd) {
    let img = new Image()
    var canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    // Get the drawing context
    var ctx = canvas.getContext('2d');
    drawBody(ctx, location.universe.player.parent)
    return `<img src="${canvas.toDataURL('image/png')}">`
  },

  help: function() {
    return `Return an image of the current orbit`
  }
}

module.exports = command