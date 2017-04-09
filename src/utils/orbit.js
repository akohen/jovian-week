const time = require('./time.js')

const orbit = {


  // shortcut functions
  e: function(body) { return body.eccentricity },
  a: function(body) { return body.sma },
  i: function(body) { return body.inclination },
  lop: function(body) { return body.longitudeOfAscendingNode + body.argumentOfPeriapsis }, // Longitude of Periapsis
  n: function(body) { return this.getMeanAngularMotion(body) },
  T: function(body) { return this.getPeriod(body) },
  t0: function(body) { return body.epoch },
  tAp: function(body, t=time.current) { return this.getTimeToNextApoapsis(body,t) },
  tPe: function(body, t=time.current) { return this.getTimeToNextPeriapsis(body,t) },
  M: function(body, t=time.current) { return this.getMeanAnomaly(body,t) },
  M0: function(body) { return body.anomalyAtEpoch },
  E: function(body, t=time.current) { return this.getEccentricAnomaly(body,t) },
  f: function(body, t=time.current) { return this.getTrueAnomaly(body,t) },
  Ap: function(body) { return this.getApoapsis(body) },
  Pe: function(body) { return this.getPeriapsis(body) },


  // tools to compute orbit and transfer parameters
  getGravitationalParameter: function(body) { return 6.67408e-11 * body.mass },


  // get orbital period in s, sma in m, mass in kg
  getPeriod: function(body) { 
    return 2 * Math.PI * Math.sqrt( Math.pow(body.sma,3) / this.getGravitationalParameter(body.parent) );
  },

  getDistanceFromParent: function(body, t=time.current) {
    let f = this.getTrueAnomaly(body,t)
    let l = body.sma * (1 - Math.pow(body.eccentricity,2)) // Semi-latus rectum
    let r = l / ( 1 + body.eccentricity * Math.cos(f))
    return r
  },

  // returns the mean velocity in m/s
  getVelocity: function(body, t=time.current) { 
    let r = body.sma //TODO use real radius at t
    
    return Math.sqrt( this.getGravitationalParameter(body.parent)*(2/r - 1/body.sma) ) 
  },

  // returns the mean velocity in m/s
  getMeanVelocity: function(body) { 
    return Math.sqrt(this.getGravitationalParameter(body.parent)/body.sma) 
  },
  

  // Returns the current angle in radians between periapsis and the body's position
  getMeanAnomaly: function(body, t=time.current) {
    let n = this.getMeanAngularMotion(body) // Mean motion
    let M = body.anomalyAtEpoch + n * (t - body.epoch)
    return M%(2*Math.PI)
  },


  // returns the eccentric anomly in radians
  getEccentricAnomaly: function(body, t=time.current) {
    let ε = 1e-18,
      maxIter = 100,
      E,
      e = body.eccentricity,
      dE = 1,
      i = 0,
      M = this.getMeanAnomaly(body,t)

    if (e < 0.8) {
      E = M;
    } else {
      E = Math.PI;
    }

    while (Math.abs(dE) > ε && i < maxIter) {
      dE = (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
      E = E + dE;
      i++;
    }

    return E;
  },


  getTrueAnomaly: function(body, t=time.current) {
    var E = this.getEccentricAnomaly(body,t)
    var e = body.eccentricity
    var v = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2))
    return v
  },

  // returns the phase angle (in degrees) between the origin body and the destination body
  getPhaseAngle: function(origin, destination, t=time.current) {
    // might need to be changed after eccentricity and inclination are added
    return this.getTrueAnomaly(destination,t) - this.getTrueAnomaly(origin,t)
  },

  // returns the apoapsis in meters (from parent center! this is not the altitude of Ap)
  getApoapsis: function(body) {
    return body.sma*(1+body.eccentricity)
  },

  // returns the periapsis in meters (from parent center! this is not the altitude of Pe)
  getPeriapsis: function(body) {
    return body.sma*(1-body.eccentricity)
  },


  // Get seconds from position to the next periapsis
  getTimeToNextPeriapsis: function(body, t=time.current) {
    let t_Pe = this.t0(body) + ( 2*Math.PI - this.M0(body) ) / this.n(body) // t_Pe = M_Pe - M0 / n + t0 [T]
    let timeLeft = (t_Pe - t) % this.T(body)
    return (timeLeft + this.T(body)) % this.T(body)
  },

  // Get seconds from position to the next apoapsis
  getTimeToNextApoapsis: function(body, t=time.current) {
    let t_Ap = this.t0(body) + ( Math.PI - this.M0(body) ) / this.n(body) // t_Pe = M_Pe - M0 / n + t0 [T]
    let timeLeft = (t_Ap - t) % this.T(body)
    return (timeLeft + this.T(body)) % this.T(body)
  },

  //
  getMeanAngularMotion: function(body) {
    return Math.sqrt( this.getGravitationalParameter(body.parent) / Math.pow(body.sma,3) )
  },

  // Returns the synodic period between two bodies, in seconds
  getSynodicPeriod: function(body, body2) {
    let inv_period = 1/this.getPeriod(body) - 1/this.getPeriod(body2)
    return Math.abs(1/inv_period)
  },


  //TODO All methods to plot trajectories should be moved to a command or to the location module ?
  // Temporary test function
  // Try to find a transfer between two orbits, at least one of which is roughly circular (e<0.1 ?)
  // For transfer between two highly eccentric orbits, we might start by circularizing initial orbit...
  getApproxTransfer() {},



  // returns the phase angle in degrees (!) for a transfer between two bodies around the same parent
  getTransferPhaseAngle(from,to) {
    //TODO check approximations, replace by solver for more complex orbits ?
    return (1 - Math.pow((from.sma + to.sma)/(2*to.sma),1.5))
  },

  // compute a hohmann transfer from the origin orbit to the destination orbit
  // 
  // Orbits must be around different bodies, but with the same parent
  getTransfer: function(from,to) {
    // variables used in computation
    let origin = from.parent // origin body
    let destination = to.parent // destination body
    let a_1 = from.sma // sma at origin orbit
    let a_2 = to.sma // sma at destination orbit
    let r_1 = origin.sma // sma of the origin body
    let r_2 = destination.sma // sma of the destination body
    let mu_p = this.getGravitationalParameter(origin.parent)
    let mu_1 = this.getGravitationalParameter(origin)
    let mu_2 = this.getGravitationalParameter(destination)

    let transferTime = Math.PI * Math.sqrt( Math.pow(r_1+r_2,3)/(8*mu_p) )

    let phaseAngle = (1 - Math.pow((r_1 + r_2)/(2*r_2),1.5)) * 180

    // Injection velocity
    let v_h1 = Math.sqrt( 2*mu_p*r_2 / (r_1*(r_1+r_2)) ) // speed of hohman transfer at start
    let v_t1 = v_h1 - this.getMeanVelocity(origin) // velocity change at departure
    let v_escape = Math.sqrt( v_t1*v_t1 + 2*mu_1/a_1 ) // velocity at departure escape
    let v_injection = v_escape - this.getMeanVelocity(from) // injection delta v

    // Insertion velocity
    let v_h2 = Math.sqrt( 2*mu_p*r_1 / (r_2*(r_1+r_2)) ) // speed of hohmann transfer at target
    let v_t2 = v_h2 - this.getMeanVelocity(destination) // velocity change at target
    let v_capture = Math.sqrt( v_t2*v_t2 + 2*mu_2/a_2 ) // velocity at target capture
    let v_insertion = v_capture - this.getMeanVelocity(to)
    let v_total = v_injection + v_insertion

    let eta = v_escape*v_escape/2 - mu_1/a_1
    let e = Math.sqrt( 1 + 2*eta*a_1*a_1*v_escape*v_escape/(mu_1*mu_1) )
    let ejectionAngle = 180 - Math.acos(1/e) * (180/Math.PI) // Angle of burn to origin's prograde

    console.log("Transfer time : " + this.timeToString(transferTime))
    console.log("Phase angle : " + phaseAngle)
    console.log("Injection delta v : " +v_injection+ "m/s")
    console.log("Escape velocity : " +v_escape)
    console.log("e : " + e)
    console.log("ejectionAngle : " + ejectionAngle)
    console.log("Insertion delta v : " +v_insertion)
    console.log("Total delta v : " + v_total)

    let sma = (r_1+r_2)/2
    let eccentricity = (r_1 - r_2)/(r_1+r_2)
    let low
    if(origin.sma < destination.sma) {
      eccentricity *= -1
      low = origin 
    } else {
      low = destination
    }

    console.log(eccentricity)
    let window = {
      phaseAngle: phaseAngle,
      transferTime: transferTime,
      ejectionAngle: ejectionAngle,
      totalDeltaV: v_total,
      origin: origin,
      destination: destination
    }
    let injection = {
      type:"transfer",
      sma:(r_1+r_2)/2,
      eccentricity:eccentricity,
      parent:origin.parent,
      argumentOfPeriapsis:this.getMeanAnomaly(low),
      anomalyAtEpoch:this.getMeanAnomaly(origin),
      epoch:time.current
    }
    let insertion = {
      type:"orbit",
      sma:a_2,
      eccentricity:0,
      parent:destination,
      argumentOfPeriapsis:0,
      anomalyAtEpoch:0,
      epoch:time.current+transferTime
    }
    return {window:window,injection:injection}
  },



  getNextWindow: function(origin, destination) {
    // Assumption : All planets / moons orbits are circular and coplanar !
    let phaseAngle = this.getTransferPhaseAngle(origin, destination)
    let angularSpeedOrigin = 360 / this.getPeriod(origin)
    let angularSpeedDestination = 360 / this.getPeriod(destination)
    let angularSpeedDifference = angularSpeedDestination - angularSpeedOrigin // difference in angular speed between the two bodies
    let currentPhaseAngle = this.getMeanAnomaly(destination) - this.getMeanAnomaly(origin)
    let windowOpens = (this.getTransferPhaseAngle(origin, destination) - currentPhaseAngle) / angularSpeedDifference
    if(windowOpens < 0) {
      windowOpens += this.getSynodicPeriod(origin, destination)
    }
    console.log("Window for transfer opens in "+this.timeToString(windowOpens))
    return windowOpens

  },







  // Time functions
  // should be moved to own module
  timeInSeconds: function(string) { // convert a string like "7d12h" to a number of seconds
    var match = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/.exec(string)
    var res = 0;
    if(match[1]) { res += (+match[1] * 24 * 3600) }
    if(match[2]) { res += (+match[2] * 3600) }
    if(match[3]) { res += (+match[3] * 60) }
    return res
  }, 
  getRemainingTime: function(time) { // returns the number of seconds until the specified timestamp (in seconds)
    return this.timeToString( time - game.currentTime );
  },
  timeToString: function(time) { // converts a time in seconds to a nicer string
    var formattedTime = ""
    if(time < 0) {
      formattedTime += '-'
      time *= -1
    }
    if(time >= 31536000) { 
      formattedTime += Math.floor(time/31536000) +"y"
      time = time % 31536000
    }
    if(time >= 86400) { 
      formattedTime += Math.floor(time/86400) +"d"
      time = time % 86400
    }
    if(time >= 3600) { 
      formattedTime += Math.floor(time/3600) +"h"
      time = time % 3600
    }
    if(time >= 60) { 
      formattedTime += Math.floor(time/60) +"m"
      time = time % 60
    }
    if(time > 0) { 
      formattedTime += Math.floor(time) +"s"
    }
    return formattedTime
  }
}

module.exports = orbit