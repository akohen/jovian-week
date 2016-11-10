const universe = {
  io:{type:"moon",sma:421,parent:"jupiter"},
  europa:{type:"moon",sma:671,parent:"jupiter"},
  ganymede:{type:"moon",sma:1070,parent:"jupiter"},
  callisto:{type:"moon",sma:1882,parent:"jupiter"},
  station:{type:"station",sma:10,parent:"callisto"},
  ship:{type:"ship",sma:8,parent:"callisto",run:function(target){ if(Math.random() > 0.7) target.takeDamage(10)}},
}

jQuery(document).ready(function($) {
  game.load()
  $('#console').terminal(game.interpreter, game.options)
  game.player.term = $('#console').terminal()
  game.loop()
});