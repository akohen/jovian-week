// Reference direction is always on top

function drawBody(ctx, body, x, y, scale) {
  let r = Math.max(5,scale * body.radius)
  ctx.strokeStyle = (body.color) ? body.color : "white"
  ctx.fillStyle = (body.color) ? body.color : "white"
  ctx.font = '18px monospace'
  ctx.beginPath()
  ctx.arc(x,y,r,0,2*Math.PI)
  ctx.stroke()
  var text = ctx.measureText(body.name)
  if(text.width < 2*r) {
    ctx.fillText(body.name, x-(text.width/2), y+5)
  } else {
    ctx.fillText(body.name, x+r, y-r)
  }
}

// Draw an orbiting body
// x/y center position
function drawOrbit(ctx, body, x, y, scale) {
  let e = body.eccentricity
  let a = body.sma * scale // semi-major axis
  let b = a*Math.sqrt(1-e*e) //semi-minor axis
  let r = body.argumentOfPeriapsis
  let E = body.E


  let centerX = x + scale * body.sma * body.eccentricity * Math.sin(r)
  let centerY = y + scale * body.sma * body.eccentricity * Math.cos(r)

  ctx.strokeStyle = (body.color) ? body.color : "white"
  ctx.fillStyle = (body.color) ? body.color : "white"

  ctx.beginPath()
  ctx.ellipse(centerX,centerY,b,a,-r,0,2*Math.PI,true)
  ctx.stroke()


  // getting the body position vector (with Pe on top)
  let posX = - b * Math.sin(E)
  let posY = - a * Math.cos(E)

  // rotating the position vector (if we have a longitude of periapsis <> 0)
  let nposX = posX * Math.cos(-r) - posY * Math.sin(-r)
  let nposY = posX * Math.sin(-r) + posY * Math.cos(-r)

  // translating
  posX = nposX + centerX
  posY = nposY + centerY

  // Drawing the body at its current location
  drawBody(ctx, body, posX, posY, scale)

}

module.exports = {
  drawBody:drawBody, 
  drawOrbit:drawOrbit
}