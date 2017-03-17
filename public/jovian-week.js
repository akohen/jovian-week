

const universe = {
  jupiter:{type:"planet",sma:0,mass:1.8986e27,parent:"sun"},
  earth:{type:"planet",sma:1.496e11,mass:5.9723e24,anomalyAtEpoch:129.55,parent:"sun"},
  /* Earth Mean Orbital Elements (J2000)
  Semimajor axis (AU)                  1.00000011  
  Orbital eccentricity                 0.01671022   
  Orbital inclination (deg)            0.00005  
  Longitude of ascending node (deg)  -11.26064  
  Longitude of perihelion (deg)      102.94719  
  Mean Longitude (deg)               100.46435
  */
  mars:{type:"planet",sma:2.2792e11,mass:6.4171e23,anomalyAtEpoch:25.27,parent:"sun"},
  /* Mars orbital elements
  Semimajor axis (AU)                  1.52366231  
  Orbital eccentricity                 0.09341233   
  Orbital inclination (deg)            1.85061   
  Longitude of ascending node (deg)   49.57854  
  Longitude of perihelion (deg)      336.04084   
  Mean Longitude (deg)               355.45332
  */
  iss:{type:"station",sma:6.780e6,mass:5e5,parent:"earth"},
  sun:{type:"sun",sma:0,mass:1.989e30},
  
  // kerbol test dataset
  kerbol:{type:"sun",sma:0,mass:1.75e28},
  kerbal:{sma:700000,mass:100,parent:"kerbin"},
  destination:{sma:700000,mass:100,parent:"duna"},
  kerbin:{type:"planet",sma:13599840256,mass:5.29e22,parent:"kerbol"},
  duna:{type:"planet",sma:20726155264,mass:4.515e21,parent:"kerbol"},
  //eve:{type:"planet",sma:9832684.544,mass:65400},

  // Transfer test orbits
  start:{sma:1.93e6,parent:"io"},
  end:{sma:1.66e6,parent:"europa"},

  io:{
    type:"moon",sma:4.217e8,mass:8.9319e22,anomalyAtEpoch:10,parent:"jupiter",
    transfers:{
      europa:{period:"3d13h",duration:"1d7h",deltav:2545},
      ganymede:{period:"2d8h",duration:"2d2h",deltav:4385},
      callisto:{period:"1d23h",duration:"3d24h",deltav:6004},
    }
  },
  europa:{
    type:"moon",sma:6.71e8,mass:4.8e22,anomalyAtEpoch:0,parent:"jupiter",
    transfers:{
      io:{period:"3d13h",duration:"1d7h",deltav:2545},
      ganymede:{period:"7d1h",duration:"2d15h",deltav:2177},
      callisto:{period:"4d12h",duration:"4d16h",deltav:3748},
    }
  },
  ganymede:{
    type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter",
    transfers:{
      io:{period:"2d8h",duration:"2d2h",deltav:4385},
      europa:{period:"7d1h",duration:"2d15h",deltav:2177},
      callisto:{period:"12d12h",duration:"5d19h",deltav:2127},
    }
  },
  callisto:{
    type:"moon",sma:1.8827e9,mass:1.0759e23,anomalyAtEpoch:0,parent:"jupiter",
    transfers:{
      io:{period:"1d23h",duration:"3d24h",deltav:6004},
      europa:{period:"4d12h",duration:"4d16h",deltav:3748},
      ganymede:{period:"12d12h",duration:"5d19h",deltav:2127},
    }
  },
  station:{type:"station",sma:10,parent:"callisto"},
  ship:{type:"ship",sma:4e6,parent:"callisto",run:function(target){ if(Math.random() > 0.7) target.takeDamage(10)}},
}

jQuery(document).ready(function($) {
  for(let name in universe) {
    let body = universe[name]
    body.name = name
    if(body.parent != null) {
      let parent = universe[body.parent]
      if(!parent.children) parent.children = {}
      body.parent = parent
      parent.children[body.name] = body
    }
  }
  game.saveSystem.load()
  $('#console').terminal(game.interpreter, game.options)
  game.term = $('#console').terminal()
  game.term.focus()
  game.loop()

  // Keep canvas drawing after a screen resize
  $(window).resize(e => {
    clearTimeout(game.resizeTimer)
    game.resizeTimer = setTimeout(function() {
      $('.orbit-test').each( (i,element) => {
        let img = new Image
        img.src = game.orbitData[i]
        $(element).get(0).getContext('2d').drawImage(img,0,0)
      })
    },150)
  })


})