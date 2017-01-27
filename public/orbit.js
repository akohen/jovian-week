game.orbit = {
  // tools to compute orbit and transfer parameters
  getGravitationalParameter: function(body) { return 6.67408e-11 * body.mass },
  getPeriod: function(body) { //get orbital period in s, sma in m, mass in kg
    return 2 * Math.PI * Math.sqrt( Math.pow(body.sma,3) / this.getGravitationalParameter(universe[body.parent]) );
  },
  getVelocity: function(body) { return Math.sqrt(this.getGravitationalParameter(universe[body.parent])/body.sma) },
  // Returns the current angle between periapsis and the body's position
  getTrueAnomaly: function(body) {
    let timeSinceEpoch = game.currentTime - game.epoch
    let period = this.getPeriod(body)
    let timeInLastOrbit = timeSinceEpoch % period
    let angleInLastOrbit = timeInLastOrbit / period * 360
    let currentAnomaly = (body.anomalyAtEpoch + angleInLastOrbit) % 360
    return currentAnomaly

  },

  // returns the phase angle between the origin body and the destination body
  getPhaseAngle: function(origin, destination) {
    // might need to be changed after eccentriciy and inclination are added
    return this.getTrueAnomaly(destination) - this.getTrueAnomaly(origin)
  },

  getSynodicPeriod: function(body, body2) {
    let inv_period = 1/this.getPeriod(body) - 1/this.getPeriod(body2)
    return Math.abs(1/inv_period)
  },
  // compute a hohmann transfer from the origin orbit to the destination orbit
  // 
  // Orbits must be around different bodies, but with the same parent
  getTransfer: function(from,to) {

    // variables used in computation
    let origin = universe[from.parent] // origin body
    let destination = universe[to.parent] // destination body
    let a_1 = from.sma // sma at origin orbit
    let a_2 = to.sma // sma at destination orbit
    let r_1 = origin.sma // sma of the origin body
    let r_2 = destination.sma // sma of the destination body
    let mu_p = this.getGravitationalParameter(universe[origin.parent])
    let mu_1 = this.getGravitationalParameter(origin)
    let mu_2 = this.getGravitationalParameter(destination)

    let transferTime = Math.PI * Math.sqrt( Math.pow(r_1+r_2,3)/(8*mu_p) )

    let phaseAngle = (1 - Math.pow((r_1 + r_2)/(2*r_2),1.5)) * 180

    // Injection velocity
    let v_h1 = Math.sqrt( 2*mu_p*r_2 / (r_1*(r_1+r_2)) ) // speed of hohman transfer at start
    let v_t1 = v_h1 - this.getVelocity(origin) // velocity change at departure
    let v_escape = Math.sqrt( v_t1*v_t1 + 2*mu_1/a_1 ) // velocity at departure escape
    let v_injection = v_escape - this.getVelocity(from) // injection delta v

    // Insertion velocity
    let v_h2 = Math.sqrt( 2*mu_p*r_1 / (r_2*(r_1+r_2)) ) // speed of hohmann transfer at target
    let v_t2 = v_h2 - this.getVelocity(destination) // velocity change at target
    let v_capture = Math.sqrt( v_t2*v_t2 + 2*mu_2/a_2 ) // velocity at target capture
    let v_insertion = v_capture - this.getVelocity(to)
    let v_total = v_injection + v_insertion

    let eta = v_escape*v_escape/2 - mu_1/a_1
    let e = Math.sqrt( 1 + 2*eta*a_1*a_1*v_escape*v_escape/(mu_1*mu_1) )
    let ejectionAngle = 180 - Math.acos(1/e) * (180/Math.PI)

    console.log("Transfer time : " + this.timeToString(transferTime))
    console.log("Phase angle : " + phaseAngle)
    console.log("Injection delta v : " +v_injection+ "m/s")
    console.log("e : " + e)
    console.log("ejectionAngle : " + ejectionAngle)
    console.log("Insertion delta v : " +v_insertion)
    console.log("Total delta v : " + v_total)

    return [transferTime, phaseAngle, v_escape, v_injection, ejectionAngle]
  },

  // Time functions
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
