const orbit = require('../utils/orbit.js')
const location = require('../location.js')

// Reference direction is always on top

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
  let e = body.eccentricity
  let a = body.sma * scale // semi-major axis
  let b = a*Math.sqrt(1-e*e) //semi-minor axis
  let r = body.argumentOfPeriapsis

  let centerX = x + scale * body.sma * body.eccentricity * Math.sin(body.argumentOfPeriapsis)
  let centerY = y + scale * body.sma * body.eccentricity * Math.cos(body.argumentOfPeriapsis)

  ctx.strokeStyle = (body.color) ? body.color : "white"
  ctx.fillStyle = (body.color) ? body.color : "white"

  console.log(`center: ${centerX},${centerY} axes:(${a},${b}) r:${r}`)
  ctx.beginPath()
  ctx.ellipse(centerX,centerY,b,a,-r,0,2*Math.PI,true)
  ctx.stroke()
  ctx.fillText(body.name, x+2*r, y-r)

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
    drawOrbit(ctx, location.universe.player,200,200,100/location.universe.player.sma)
    return `<img src="${canvas.toDataURL('image/png')}">`
  },

  help: function() {
    return `Return an image of the current orbit`
  }
}

module.exports = command