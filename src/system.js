const player = require('./player.js')
const time = require('./utils/time.js')
const location = require('./location.js')
const db = require('./db.js')

const system = {
  updateDelta: 2500, // time between updates in ms
  epoch:0,
  runAtUpdate: [],
  lastSave:0,
  saveDelta:30000, // time between autosaves in ms

  
  save: function() {
    console.log('saving')
    db.universe.bulkPut(location.save())
    localStorage.setItem("save",JSON.stringify({
      name: player.name,
      location: player.location,
      status: player.status,
      deltav: player.deltav,
      balance: player.balance,
      hull: player.hull,
    }))
  },


  load: function() {
    console.log('loading')
    db.universe.toArray().then(data => {
      location.load(data)
    })

    var saveData = JSON.parse(localStorage.getItem("save"))
    if(!saveData) { return }
    this.epoch = Math.floor(Date.now() / 1000)
    player.name = saveData.name
    player.location = saveData.location
    player.status = saveData.status
    player.deltav = saveData.deltav
    player.balance = saveData.balance
    player.hull = saveData.hull
  },


  // Update loop
  
  addToUpdate: function(f) {
    if( typeof f == "function") this.runAtUpdate.push(f)
  },
  update: function() {
    console.log('update')

    for(let f of system.runAtUpdate) { f() } // 


    // Run autosave
    system.lastSave += system.updateDelta
    if(system.lastSave >= system.saveDelta) {
      system.lastSave = 0
      system.save()
    }


    setTimeout(system.update, system.updateDelta); // Next loop
  },

}

module.exports = system