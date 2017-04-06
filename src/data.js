const time = require('./utils/time.js')

const defaults = {
  // Physical properties
  mass:0, // mass in kg
  radius:0, // radius of surface / edge of atmosphere in m. if no atmosphere, prefer mean volumetric radius
  color:"green", // color of the body on maps

  // Orbital elements
  sma:0, // Semi-major axis in meters
  anomalyAtEpoch:0, // Mean anomaly at epoch, in radians
  eccentricity:0,
  inclination:0, // In radians
  longitudeOfAscendingNode:0, // in radians (angle from Vernal point to ascending node)
  argumentOfPeriapsis:0, // in degrees
  epoch:time.current, // timestamp (in seconds)
}

// Data to be loaded on a new save
const solarSystem = [
  {name:"sun", type:"sun", sma:0, mass:1.989e30, radius:6.957e8, color:"yellow"},
    {name:"mercury", type:"planet", sma:5.7909e10,mass:3.3011e23, radius:2.439e6, anomalyAtEpoch:0, eccentricity:0, parent:"sun", color:"red"},
    {name:"jupiter", type:"planet", sma:778.57e9, mass:1.8986e27, radius:71.492e6, eccentricity:0.0489,parent:"sun", color:"orange"},
      {name:"io", type:"moon", sma:4.217e8, mass:8.9319e22, anomalyAtEpoch:0.5, radius:1.82e6, parent:"jupiter"},
        {name:"start",sma:1.93e6,parent:"io"},
      {name:"europa", type:"moon",sma:6.71e8,mass:4.8e22,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"end",sma:1.66e6,parent:"europa"},
      {name:"ganymede", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
      {name:"callisto", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"station", type:"station",sma:10,parent:"callisto"},
    {name:"earth", type:"planet", sma:1.496e11, mass:5.9723e24, anomalyAtEpoch:129.55*Math.PI/180, radius:6.371e6, eccentricity:0.0167, parent:"sun", color:"aqua"},
      {name:"iss", type:"station",sma:6.782e6,mass:5e5,parent:"earth",eccentricity:0.0007358},
    {name:"mars", type:"planet",sma:2.2792e11,mass:6.4171e23,anomalyAtEpoch:25.27*Math.PI/180,parent:"sun", color:"red"},


  {name:"player", type:"ship", parent:"earth", mass:1e4, 
    sma:9.3e6, anomalyAtEpoch:1, eccentricity:0.2, argumentOfPeriapsis:1
  },

/* Earth Mean Orbital Elements (J2000)
  Semimajor axis (AU)                  1.00000011  
  Orbital eccentricity                 0.01671022   
  Orbital inclination (deg)            0.00005  
  Longitude of ascending node (deg)  -11.26064  
  Longitude of perihelion (deg)      102.94719  
  Mean Longitude (deg)               100.46435
 

 Mars orbital elements
  Semimajor axis (AU)                  1.52366231  
  Orbital eccentricity                 0.09341233   
  Orbital inclination (deg)            1.85061   
  Longitude of ascending node (deg)   49.57854  
  Longitude of perihelion (deg)      336.04084   
  Mean Longitude (deg)               355.45332
  */


  // kerbol test dataset
  {name:"kerbol", type:"sun",sma:0,mass:1.75e28},
    {name:"kerbin",type:"planet",sma:13599840256,mass:5.29e22,parent:"kerbol"},
      {name:"kerbal",sma:700000,mass:100,parent:"kerbin"},
    {name:"duna", type:"planet",sma:20726155264,mass:4.515e21,parent:"kerbol"},
      {name:"destination",sma:700000,mass:100,parent:"duna"},
]

solarSystem.forEach(body => {
  for(let v in defaults) {
    if(!body[v]) body[v] = defaults[v]
  }
})

module.exports = {
  solarSystem:solarSystem, 
  defaults:defaults
}