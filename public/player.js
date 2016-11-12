game.player = {
  name: "jed",
  location: "europa",
  status: "orbiting",
  deltav: 100,
  balance: 156456000,
  hull: 100,
  takeDamage: function(damage) { this.hull -= 10; game.term.echo('[[;red;]Took '+damage+' damage!]')},
  canDock: function() { return (universe[game.player.location].type == "station")},
  dock: function() {},
  undock: function() {},
}
