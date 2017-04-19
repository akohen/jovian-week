'use strict';

const data = require('../data.js')
const time = require('./time.js')

class Body {
  constructor(params) {
    if(params.parent) {
      let parent = params.parent;
      delete params.parent;
      this.parent = parent;
    }
    Object.assign(this,data.defaults,{epoch:time.current},params)
    if(this.parent && this.parent.addChild) this.parent.addChild(this);
    this.children = {};
  }

  /*
  Usage suggestion ?
  Create with body = new Body({data})
  if no parent object in data : body.setParent(parent)
  body.a / body.e etc... get values at the current time
  to get values at a later time : futureBody = body.getStateAt(t1)
  futureBody.param will return param value at t1
  to adjust to a specifid time, set body.time ( use body.time += x to add x seconds from current position)
  */

  get e() { return this.eccentricity }
  get a() { return this.sma }
  get i() { return this.inclination }
  get lop() { return this.longitudeOfAscendingNode + this.argumentOfPeriapsis }
  get n() { return Math.sqrt( this.parent.µ / Math.pow(this.a,3) ) } // Mean angular motion
  get T() { return 2 * Math.PI * Math.sqrt( Math.pow(this.a,3)/this.parent.µ ) } // orbital period
  get t0() { return this.epoch }
  get tAp() { return }
  get tPe() { return }
  get time() { return (this.tRef) ? this.tRef : time.current } // time at which to compute all values
  set time(t) { this.tRef = t }
  get M() { return this.getMeanAnomaly() }
  get M0() { return this.anomalyAtEpoch }
  get E() { return this.getEccentricAnomaly() }
  get f() { return this.getTrueAnomaly() }
  get Ap() { return }
  get Pe() { return }
  get r() { return this.a * ( 1 - this.e * Math.cos(this.E) ) }
  get h() { return this.r - this.parent.radius }
  get µ() { return 6.67408e-11 * this.mass }
  get v() { return this.getVelocity() }


  // Parent / children functions
  setParent(parent) { 
    if(this.parent) this.parent.removeChild(this);
    this.parent = parent
    parent.addChild(this)
  }

  addChild(child) {
    this.children[child.name] = child
  }

  removeChild(child) {
    if(this.children[child.name]) delete this.children[child.name]
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



  // Velocity functions
  getVelocity() {
    return Math.sqrt( this.parent.µ * (2/this.r - 1/this.a) )
  }


  // Time functions
  getPeriod() {

  }


  // Maneuver functions
  // this returns a temporary copy !
  getStateAt(t=this.time) { // Returns the body with the maneuvers applied at t
    return t
  }

  addManeuver(maneuver) {
    if(!this.maneuvers) this.maneuvers = [];
    if( maneuver.epoch > getFinalState().epoch ) this.maneuvers.push(maneuver);
  }

  // get state once all the remaining maneuvers have been executed
  // this returns a temporary copy !
  getFinalState() { 

  }

  // If modifyOthers = false, will not modify other objects
  doManeuver(maneuver, modifyOthers = true) {

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