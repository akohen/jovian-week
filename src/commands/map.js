const orbit = require('../utils/orbit.js')
const location = require('../location.js')

function drawBody(ctx, body, x, y, scale) {
  let r = scale
  ctx.strokeStyle = (body.color) ? body.color : "white"
  ctx.fillStyle = (body.color) ? body.color : "white"
  ctx.font = '18px monospace'
  ctx.beginPath()
  ctx.arc(x,y,r,0,2*Math.PI)
  ctx.stroke()
  ctx.fillText(body.name, x+r, y-r)
}

// Draw an orbiting body
// x/y center position
//TODO r => should be changed to a scaling factor ?
function drawOrbit(ctx, body, x, y, scale) {
  let r = scale
  ctx.strokeStyle = (body.color) ? body.color : "white"
  ctx.fillStyle = (body.color) ? body.color : "white"
  console.log(ellipseCenterOffset(body))
  ctx.beginPath()
  ctx.ellipse(x,y,150,100,-Math.PI/8,0,Math.PI,true)
  ctx.stroke()
  ctx.fillText(body.name, x+2*r, y-r)

}

function ellipseCenterOffset(body) {
  let centerX = body.sma * body.eccentricity * Math.cos(body.argumentOfPeriapsis)
  let centerY = body.sma * body.eccentricity * Math.sin(body.argumentOfPeriapsis)
  return [centerX,centerY]
}

const command = {
  run: function(cmd) {
    let img = new Image()
    var canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;

    // Get the drawing context
    var ctx = canvas.getContext('2d');
    drawBody(ctx, location.universe.player.parent,200,200,60)
    drawOrbit(ctx, location.universe.player,200,200,60)
    return `<img src="${canvas.toDataURL('image/png')}">`
  },

  help: function() {
    return `Return an image of the current orbit`
  }
}

module.exports = command