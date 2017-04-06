const location = require('../../location.js')
const mapTools = require('./mappingTools.js')

// usage map target (default player)
const command = {
  run: function(cmd) {
    var target = location.universe.player
    if(location.universe[cmd]) target = location.universe[cmd]

    let img = new Image()
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;

    // Get the drawing context
    var ctx = canvas.getContext('2d');
    var scale = 100/target.sma
    mapTools.drawBody(ctx, target.parent,200,200,scale)
    mapTools.drawOrbit(ctx, target,200,200,scale)
    return `<img src="${canvas.toDataURL('image/png')}">`
  },

  help: function() {
    return `Return an image of the current orbit`
  }
}

module.exports = command