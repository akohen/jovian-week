const player = require('./player.js')

const location = {
  universe:{},

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
  load:function(data) {
    for(let body of data) {
      if(!this.universe[body.name]) this.universe[body.name] = {}

      if(body.parent != null) {
        if(!this.universe[body.parent]) this.universe[body.parent] = {}
        let parent = this.universe[body.parent]
        body.parent = parent
        if(!parent.children) parent.children = {}
        parent.children[body.name] = this.universe[body.name]
      }

      Object.assign(this.universe[body.name], body) // adding properties
    }
    player.ship = this.universe.player
  },
  
  save:function() {
    const tempUniverse = []
    for(let name in this.universe) {
      let temp = Object.assign({},this.universe[name])
      if(temp.parent) temp.parent = temp.parent.name
      if(temp.children) delete temp.children
      tempUniverse.push(temp)
    }
    return tempUniverse
  },
}

module.exports = location