game.orbit = {
  // tools to compute orbit and transfer parameters
  getGravitationalParameter: function(body) { return 6.67408e-11 * body.mass },
  getPeriod: function(body) { //get orbital period in s, sma in m, mass in kg
    return 2 * Math.PI * Math.sqrt( Math.pow(body.sma,3) / this.getGravitationalParameter(universe[body.parent]) );
  },
  getVelocity: function(body) { return Math.sqrt(this.getGravitationalParameter(universe[body.parent])/body.sma) },
  timeInSeconds: function(string) { // convert a string like "7d12h" to a number of seconds
    var match = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/.exec(string)
    var res = 0;
    if(match[1]) { res += (+match[1] * 24 * 3600) }
    if(match[2]) { res += (+match[2] * 3600) }
    if(match[3]) { res += (+match[3] * 60) }
    return res
  }, 
  getRemainingTime: function(time) { // returns the number of seconds until the specified timestamp (in seconds)
    return this.timeToString( time - Math.floor(Date.now() / 1000) );
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
      formattedTime += time +"s"
    }
    return formattedTime
  }
}
