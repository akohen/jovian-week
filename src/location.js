const player = require('./player.js')
const time = require('./utils/time.js')

const location = {
  universe:{},

  update: function() { // updating the universe
    for(let name in this.universe) {
      this.updateBody(this.universe[name])
    }
  },

  updateBody: function(body) { //
    if(body.maneuvers && body.maneuvers.length > 0) {
      if(this.doManeuver(body,body.maneuvers[0])) {
        body.maneuvers.shift()
        this.updateBody(body)
      }
    }
  },

  // Will try to make body perform the maneuver, which can be either a new orbit, or a description of a burn (TODO)
  doManeuver: function(body, maneuver) {
    const params = ['sma', 'anomalyAtEpoch', 'eccentricity', 'inclination', 'longitudeOfAscendingNode', 'argumentOfPeriapsis']

    //TODO check if the maneuver is due
    if(maneuver.epoch > time.current) return false;

    //TODO check if the maneuver can be performed ?

    //TODO change orbit
    for(let p of params) {
      if(maneuver[p] !== undefined) body[p] = maneuver[p]
    }

    if(maneuver.parent && this.universe[maneuver.parent]) this.setParent(body,this.universe[maneuver.parent]);


    //TODO change body resources ?

    return true
  },

  addManeuver: function(body, maneuver) {
    if(!body.maneuvers) body.maneuvers = [];
    //TODO check if maneuver can be performed ?
    body.maneuvers.push(maneuver)
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

  // change the parent of a body
  setParent: function(body, newParent) {
    delete body.parent.children[body.name]
    body.parent = newParent
    if(!newParent.children) newParent.children = {}
    newParent.children[body.name] = body
  },

  //TODO Most celestial bodies "on rails" should probably be left alone during the save/load cycle
  //TODO Only save ships to db ?
  //TODO Only save updated bodies to db ?
  //TODO move to a load / save system
  import:function(data) {
    for(let body of data) {
      if(!this.universe[body.name]) this.universe[body.name] = {}

      Object.assign(this.universe[body.name], body) // adding properties

      if(body.parent != null) {
        if(!this.universe[body.parent]) this.universe[body.parent] = {}
        let parent = this.universe[body.parent]
        this.universe[body.name].parent = parent
        if(!parent.children) parent.children = {}
        parent.children[body.name] = this.universe[body.name]
      }

    }
    player.ship = this.universe.player
  },
  
  export:function() {
    const tempUniverse = []
    for(let name in this.universe) { // we create temporary copies to "flatten" the graph
      let temp = Object.assign({},this.universe[name]) // copies the orginal in a new object
      if(temp.parent) temp.parent = temp.parent.name
      if(temp.children) delete temp.children
      tempUniverse.push(temp)
    }
    return tempUniverse
  },

  reset: function() {
    for(let body in this.universe) {
      delete this.universe[body]
    }
  },

}

module.exports = location