// Orbit is made of the following elements
// parent body
// sma in meters
// mass in kg
// anomaly at epoch in degrees
// epoch (if empty should be set to the universe's epoch)

// Split bodies in two ? Orbital elements and physical properties ? (name, type, mass, radius, etc...)

// Can include (to be removed ?)
// type of object
// pre-planned transfer list
// radius at equator in m

// To be added
// Eccentricity
// Inclination
// Longitude of ascending node
// Argument of periapsis
/*
game.universe = {
  sun:{
    body:{
      type:"sun",
      mass:1.989e30,
      radius:6.957e8,
      color:"yellow"
    },
    orbit:{
      sma:0,
      eccentricity:0,
      anomaly:0,
      parent:"earth"
    }
  },
  earth:{
    body:{
      type:"planet",
      mass:5.9723e24,
      radius:6.371e6,
      color:'blue',
    },
    orbit:{
      sma:1.496e11,
      eccentricity:0,
      anomaly:129.55,
      parent:"sun"
    }
  },
  iss:{
    body:{
      type:"station",
      mass:5e5,
      radius:50,
      color:"red"
    },
    orbit:{
      sma:0,
      eccentricity:0,
      anomaly:0,
      parent:"earth"
    }
  },
  mars:{
    body:{
      type:"station",
      mass:5e5,
      radius:50,
      color:"red"
    },
    orbit:{
      sma:0,
      eccentricity:0,
      anomaly:0,
      parent:"sun"
    }
  },
}*/