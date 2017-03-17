const time = require('./utils/time.js')

const defaults = {
  // Physical properties
  mass:0, // mass in kg
  radius:0, // radius of surface / edge of atmosphere in m

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
  {name:"sun", type:"sun", sma:0, mass:1.989e30},
    {name:"jupiter", type:"planet", sma:0, mass:1.8986e27, parent:"sun"},
      {name:"io", type:"moon",sma:4.217e8,mass:8.9319e22,anomalyAtEpoch:0.5,parent:"jupiter"},
        {name:"start",sma:1.93e6,parent:"io"},
        {name:"player", type:"ship",sma:1.93e6,mass:1e4,anomalyAtEpoch:0,parent:"io"},
      {name:"europa", type:"moon",sma:6.71e8,mass:4.8e22,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"end",sma:1.66e6,parent:"europa"},
      {name:"ganymede", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
      {name:"callisto", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"station", type:"station",sma:10,parent:"callisto"},
    {name:"earth", type:"planet", sma:1.496e11, mass:5.9723e24, anomalyAtEpoch:129.55*Math.PI/180, parent:"sun"},
      {name:"iss", type:"station",sma:6.780e6,mass:5e5,parent:"earth"},
    {name:"mars", type:"planet",sma:2.2792e11,mass:6.4171e23,anomalyAtEpoch:25.27*Math.PI/180,parent:"sun"},

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

module.exports = {solarSystem:solarSystem}