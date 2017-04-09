module.exports = {
  current:Math.floor(Date.now() / 1000), // Current timestamp, set once, then updated during update loop

  timeInSeconds: function(string) { // convert a string like "7d12h" to a number of seconds
    var match = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/.exec(string)
    var res = 0;
    if(match[1]) { res += (+match[1] * 24 * 3600) }
    if(match[2]) { res += (+match[2] * 3600) }
    if(match[3]) { res += (+match[3] * 60) }
    return res
  }, 

  getRemainingTime: function(time) { // returns the number of seconds until the specified timestamp (in seconds)
    return this.timeToString( time - this.current );
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
  },

  timeToSimpleString: function(time) {
    let formattedTime = this.timeToString(time)
    formattedTime = /^-?((\d+)[a-z]){1,2}/.exec(formattedTime)
    return formattedTime[0]
  },


}