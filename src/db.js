const Dexie = require('dexie')
const data = require('./data.js')
const db = new Dexie('jovianWeek');

db.version(1).stores({
    universe:'name',
});

db.on("populate", function() {
  console.log('populate')
  db.universe.bulkAdd(data.solarSystem)
});

db.open().catch(function (e) {
    console.error("Open failed: " + e);
});


module.exports = db