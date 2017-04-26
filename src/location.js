const time = require('./utils/time.js')
const Body = require('./utils/body.js')

const location = {
  universe:{},

  update: function() { // updating the universe
    for(let name in this.universe) {
      this.universe[name].update()
    }
  },

  // Returns a well formatted distance, input is in meters
  getFormattedDistance: function(distance) {
    let unit = " m"
    if(distance > 1e6) {
      distance = Math.round(distance/1000)
      unit = " km"
    }
    return (distance + unit).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ")
  },

  //TODO Most celestial bodies "on rails" should probably be left alone during the save/load cycle
  //TODO Only save ships to db ?
  //TODO Only save updated bodies to db ?
  //TODO move to a load / save system
  import:function(data) {
    for(let body of data) {
     this.universe[body.name] = new Body(body)
    }

    for(let name in this.universe) {
      let body = this.universe[name]
      if(body.parent) {
        body.setParent(this.universe[body.parent])
      } 
    }
  },
  
  export:function() {
    const tempUniverse = []
    for(let name in this.universe) { // we create temporary copies to "flatten" the graph
      tempUniverse.push(this.universe[name].export)
    }
    return tempUniverse
  },

  reset: function() {
    console.log("reset")
    for(let body in this.universe) {
      delete this.universe[body]
    }

    this.import(require('./data.js').solarSystem);
    console.log(this.universe.player.parent.name)
    console.log("reset done")

  },

}

module.exports = location