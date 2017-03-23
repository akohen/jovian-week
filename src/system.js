const player = require('./player.js')
const time = require('./utils/time.js')
const location = require('./location.js')
const db = require('./db.js')

const system = {
  updateDelta: 5000, // time between updates in ms
  epoch:0,
  runAtUpdate: [],
  lastSave:0,
  saveDelta:60000, // time between autosaves in ms

  
  save: function() {
    console.log('saving')
    db.universe.bulkPut(location.save())
  },


  load: function() {
    return db.universe.toArray().then(data => {
      location.load(data)
    })
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