'use strict';

const data = require('../data.js')
const time = require('./time.js')
const universe = require('../location.js').universe

class Body {
  constructor(args) {
    let params = Object.assign({}, args)
    if(params.parent) {
      let parent = params.parent;
      delete params.parent;
      this.parent = parent;
    }
    Object.assign(this,data.defaults,{epoch:time.current},params)
    if(this.parent && this.parent.addChild) this.parent.addChild(this);
    this.children = {};
    this.maneuvers = [];
  }

  /*
  Usage suggestion ?
  Create with body = new Body({data})
  if no parent object in data : body.setParent(parent)
  body.a / body.e etc... get values at the current time
  to get values at a later time : futureBody = body.getStateAt(t1)
  futureBody.param will return param value at t1
  to adjust to a specific time, set body.time ( use body.time += x to add x seconds from current position)
  */

  get e() { return this.eccentricity }
  get a() { return this.sma }
  get i() { return this.inclination }
  get lop() { return this.longitudeOfAscendingNode + this.argumentOfPeriapsis }
  get n() { return Math.sqrt( this.parent.µ / Math.pow(this.a,3) ) } // Mean angular motion
  get T() { return this.getPeriod() } // orbital period
  get t0() { return this.epoch }
  get tAp() { return this.getTimeAtNextMeanAnomaly(Math.PI) }
  get tPe() { return this.getTimeAtNextMeanAnomaly(2*Math.PI) }
  get time() { return (typeof this.tRef !== 'undefined') ? this.tRef : time.current } // time at which to compute all values
  set time(t) { this.tRef = t } // override current time as reference time for computations
  resetTime() { delete this.tRef }
  get M() { return this.getMeanAnomaly() }
  get M0() { return this.anomalyAtEpoch }
  get E() { return this.getEccentricAnomaly() }
  get f() { return this.getTrueAnomaly() }
  get Ap() { return this.getApoapsis() }
  get Pe() { return this.getPeriapsis() }
  get r() { return this.a * ( 1 - this.e * Math.cos(this.E) ) }
  get h() { return this.r - this.parent.radius }
  get hAp() { return this.Ap - this.parent.radius }
  get hPe() { return this.Pe - this.parent.radius }
  get µ() { return 6.67408e-11 * this.mass }
  get v() { return this.getVelocity() }


  // Parent / children functions
  // Set updateParent to false to leave parent bodies unchanged (to simulate but not apply a parent change for example)
  setParent(parent, updateParent = true) { 
    if(updateParent) {
      if(this.parent && this.parent.removeChild) this.parent.removeChild(this);
      parent.addChild(this)
    }
    this.parent = parent
  }

  addChild(child) {
    this.children[child.name] = child
  }

  removeChild(child) {
    if(this.children[child.name]) delete this.children[child.name]
  }

  // Returns the list of parent bodies, from the root to the current body
  getParents() {
    let current = this;
    let parents = []
    while(current != null) {
      parents.unshift(current);
      current = current.parent;
    }
    return parents
  }

  // returns the lowest common ancestor of two bodies
  // LCA(earth,iss) => earth
  // can return null if bodies do not belong to the same tree
  getLCA(body) {
    let otherParents = body.getParents()
    let thisParents = this.getParents()
    let next = thisParents.shift()
    let ancestor = null
    while(next == otherParents.shift()) {
      ancestor = next
      next = thisParents.shift()
    }
    return ancestor
  }



  // Anomaly functions
  getMeanAnomaly(t=this.time) {
    let M = this.M0 + this.n * (t - this.t0)
    return M%(2*Math.PI)
  }

  getEccentricAnomaly(t=this.time) {
    let ε = 1e-18,
      maxIter = 100,
      E,
      dE = 1,
      i = 0,
      M = this.getMeanAnomaly(t)

    if (this.e < 0.8) {
      E = M;
    } else {
      E = Math.PI;
    }

    while (Math.abs(dE) > ε && i < maxIter) {
      dE = (M + this.e * Math.sin(E) - E) / (1 - this.e * Math.cos(E));
      E = E + dE;
      i++;
    }

    return E;
  }

  getTrueAnomaly(t=this.time) {
    return 2 * Math.atan( Math.sqrt( (1+this.e)/(1-this.e) ) * Math.tan(this.getEccentricAnomaly(t)/2) )
  }


  // Distance and altitude functions
  getApoapsis() { return this.a * (1 + this.e) }
  getPeriapsis() { return this.a * (1 - this.e) }


  // Velocity functions
  getVelocity() {
    return Math.sqrt( this.parent.µ * (2/this.r - 1/this.a) )
  }

  getMeanVelocity() {
    return Math.sqrt( this.parent.µ / this.a )
  }




  // Position
  // Returns an x,y position relative to the parent
  // Y is positive towards reference direction
  // X = reference direction - 90°
  getRelativePosition() {
    let x = - this.r * Math.sin( this.lop + this.f )
    let y = this.r * Math.cos( this.lop + this.f )

    return [x,y]
  }

  getPositionFrom(body) {
    let position = [0,0]
    let current = this;
    while(current != body) {
      if(!current) return undefined; // body is not a parent, so we can't determine the position
      let distanceToParent = current.getRelativePosition();
      position[0] += distanceToParent[0]
      position[1] += distanceToParent[1]
      current = current.parent
    }
    return position;
    // position of moon to sun = moon%earth + earth%sun
  }

  // Returns the distance in meters between two bodies that belong to the same tree (they have a parent in common)
  getDistanceFrom(body) {
    let LCA = this.getLCA(body)
    if(!LCA) return undefined;
    let thisPosition = this.getPositionFrom(LCA)
    let otherPosition = body.getPositionFrom(LCA)
    let relativePosition = [otherPosition[0] - thisPosition[0], otherPosition[1] - thisPosition[1]]
    let distance = Math.sqrt( Math.pow(relativePosition[0],2) + Math.pow(relativePosition[1],2) )
    return distance
  }



  // Time functions
  getPeriod() {
    return 2 * Math.PI * Math.sqrt( Math.pow(this.a,3)/this.parent.µ );
  }
  getTimeAtNextMeanAnomaly(Mi) {
    let ti = this.t0 + ( Mi - this.M0 ) / this.n
    let timeleft = (ti -this.time) % this.T
    return this.time + (timeleft + this.T) % this.T
  }

  getSynodicPeriod(body) {
    let inversePeriod = 1/this.T - 1/body.T
    return Math.abs(1/inversePeriod)
  }



  // Maneuver functions
  getCopy(t=this.time) {
    let copy = new Body() // setting prototype
    copy = Object.assign(copy,this); // setting attributes
    if(!copy.original) copy.original = this; // setting link to original value
    // copying maneuvers
    copy.maneuvers = []
    for(let maneuver of this.maneuvers) {
      copy.maneuvers.push(maneuver)
    }
    copy.time = t; // setting time
    return copy;
  }

  // this returns a temporary copy !
  getStateAt(t=this.time) { // Returns the body with the maneuvers applied at t, cannot go back in time
    let copy = this.getCopy(t)
    while(copy.maneuvers.length > 0 && copy.maneuvers[0].epoch < t) {
      copy.doNextManeuver(false)
    }
    return copy
  }

  // get state once all the remaining maneuvers have been executed
  // this returns a temporary copy !
  getFinalState() { 
    let copy = this.getCopy(t)
    while(copy.maneuvers.length > 0) {
      copy.doNextManeuver(false)
    }
    copy.time = copy.epoch;
    return copy;
  }

  isNextManeuverDue() {
    if(!this.maneuvers || this.maneuvers.length == 0) return false
    if(this.maneuvers[0].epoch > this.time) return false;
    return true
  }

  doNextManeuver(modifyOthers = true) {
    let maneuver = this.maneuvers[0]
    if(maneuver) {
      this.maneuvers.shift();
      return this.doManeuver(maneuver, modifyOthers);
    }
    else return false;
  }

  // If modifyOthers = false, will not modify other objects
  doManeuver(maneuver, modifyOthers = true) {
    const params = ['sma', 'anomalyAtEpoch', 'eccentricity', 'inclination', 'longitudeOfAscendingNode', 'argumentOfPeriapsis', 'epoch']
    

    for(let p of params) {
      if(maneuver[p] !== undefined) this[p] = maneuver[p]
    }

    if(maneuver.parent && universe[maneuver.parent]) this.setParent(universe[maneuver.parent], modifyOthers);
    
    return true
  }

  addManeuver(maneuver) {
    let original = (this.original) ? this.original : this;
    if(!original.maneuvers) original.maneuvers = [];
    if(original.maneuvers.length == 0 || maneuver.epoch > original.maneuvers[original.maneuvers.length-1].epoch ) original.maneuvers.push(maneuver);
  }

  update() {
    while(this.isNextManeuverDue()) {
      this.doNextManeuver()
    }
  }


  // Conversion between kelplerian elements and cartesian coordinates
  // Useful for applying maneuvers
  toCartesian() {
    // All this is done assuming i = 0 and Ω = 0

    // Get state vectors in the body inertial frame
    let x = this.r * Math.cos(this.f)
    let y = this.r * Math.sin(this.f)
    let vel = this.n * this.a / ( Math.sqrt(1-Math.pow(this.e,2)) )
    let dx = - vel * Math.sin(this.f)
    let dy = vel * ( this.e + Math.cos(this.f) )

    // Rotate reference frame by ω to get to q-frame
    //TODO

    return [x,y,0,dx,dy,0]
  }

  fromCartesian() {
    // Assuming i = 0 and Ω = 0, we need to update : a,e,ω,M
    //TODO

  }


  // tools
  get export() {
    let copy = {}

    for(let prop of Object.keys(this)) {
      copy[prop] = this[prop]
    }

    delete copy.parent;
    delete copy.children;
    if(this.parent) copy.parent = this.parent.name;

    return copy
  }


};

module.exports = Body;