const universe = {
  jupiter:{type:"planet",sma:0,mass:1.8986e27},
  earth:{type:"planet",sma:0,mass:5.972e24},
  iss:{type:"station",sma:6.780e6,mass:5e5,parent:"earth"},
  io:{
    type:"moon",sma:4.217e8,mass:8.9319e22,parent:"jupiter",
    transfers:{
      europa:{period:"3d13h",duration:"1d7h",deltav:2545},
      ganymede:{period:"2d8h",duration:"2d2h",deltav:4385},
      callisto:{period:"1d23h",duration:"3d24h",deltav:6004},
    }
  },
  europa:{
    type:"moon",sma:6.71e8,mass:4.8e22,parent:"jupiter",
    transfers:{
      io:{period:"3d13h",duration:"1d7h",deltav:2545},
      ganymede:{period:"7d1h",duration:"2d15h",deltav:2177},
      callisto:{period:"4d12h",duration:"4d16h",deltav:3748},
    }
  },
  ganymede:{
    type:"moon",sma:1.070412e9,mass:1.4819e23,parent:"jupiter",
    transfers:{
      io:{period:"2d8h",duration:"2d2h",deltav:4385},
      europa:{period:"7d1h",duration:"2d15h",deltav:2177},
      callisto:{period:"12d12h",duration:"5d19h",deltav:6004},
    }
  },
  callisto:{
    type:"moon",sma:1.8827e9,mass:1.0759e23,parent:"jupiter",
    transfers:{
      io:{period:"1d23h",duration:"3d24h",deltav:6004},
      europa:{period:"4d12h",duration:"4d16h",deltav:3748},
      ganymede:{period:"12d12h",duration:"5d19h",deltav:2127},
    }
  },
  station:{type:"station",sma:10,parent:"callisto"},
  ship:{type:"ship",sma:8,parent:"callisto",run:function(target){ if(Math.random() > 0.7) target.takeDamage(10)}},
}

jQuery(document).ready(function($) {
  game.saveSystem.load()
  $('#console').terminal(game.interpreter, game.options)
  game.term = $('#console').terminal()
  game.loop()
});