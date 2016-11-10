game.save = function() {
  console.log('saving')
  localStorage.setItem("save",JSON.stringify({
    name: game.player.name,
    location: game.player.location,
    status: game.player.status,
    deltav: game.player.deltav,
    balance: game.player.balance,
    hull: game.player.hull,
  }))
}

game.load = function() {
  console.log('loading')
  var saveData = JSON.parse(localStorage.getItem("save"))
  game.player.name = saveData.name
  game.player.location = saveData.location
  game.player.status = saveData.status
  game.player.deltav = saveData.deltav
  game.player.balance = saveData.balance
  game.player.hull = saveData.hull
}