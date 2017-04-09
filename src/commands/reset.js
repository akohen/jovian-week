const db = require('../db.js')
const data = require('../data.js')
const location = require('../location.js')

const command = {
  run: function(cmd) {
    location.reset();
    location.import(data.solarSystem);

/*
    db.transaction('rw', db.universe, function() {
      db.universe.clear();
      db.universe.bulkAdd(data.solarSystem);
    }).then(function() {

        console.log("Transaction committed");

    }).catch(function(err) {
        console.error(err.stack);
    });
    */


    return cmd
  },

  help: function() {
    return `Reset the game world`
  }
}

module.exports = command