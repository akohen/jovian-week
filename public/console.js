var game = {
  lastSave:0,
  interpreter: function(command, term) {
    const cmd = $.terminal.parse_command(command)
    switch(cmd.name) {
      case "help":
        term.echo("available commands are mysql, js, test");
        break;

      case "scan":
        $.each(universe,function(name,object) {
          if(cmd.args.length == 0) {
            term.echo(name);
          } else if(cmd.args[0] == object.parent) {
            term.echo(name);
          }      
        })
        break;

      case "echo":
        term.echo(cmd.args[0]);
        break;

      case "balance":
        term.echo("Current balance : ¥"+game.player.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        break;

      case "dock":
        if(game.player.canDock()) {
          game.blocked = true;
          var step = 0;
          term.set_prompt("Docking");
          (function docking() {
            step++;
            if(step<20) {
              term.set_prompt(term.get_prompt()+".")
              setTimeout(docking, 100)
            } else {
              term.echo('Successfully docked')
              game.blocked = false;
              game.player.status = "docked"
              term.set_prompt(game.setPrompt)
            }
          })()
        } else {
          term.echo("Can't dock")
        }
        break;


      case "undock":
        if(game.player.status == "docked") {
          game.blocked = true;
          var step = 0;
          term.set_prompt("Undocking");
          (function docking() {
            step++;
            if(step<20) {
              term.set_prompt(term.get_prompt()+".")
              setTimeout(docking, 100)
            } else {
              term.echo('Successfully undocked')
              game.blocked = false;
              game.player.status = "orbiting"
              term.set_prompt(game.setPrompt)
            }
          })()
        } else {
          term.echo("Not docked")
        }
        break;

      case "rpc":
        term.push('test', { prompt: 'test> ',name: 'test', login: true} );
        break;

      case "test":
        term.pause()
        term.echo("Terminal paused, press q to resume");
        break;      

      case "status":
        term.echo("Currently " +game.player.status+" "+ game.player.location)
        term.echo("Semi-major axis " + universe[game.player.location].sma + " 000 km")
        term.echo("Fuel level " + game.player.deltav + "%")
        term.echo("Hull integrity " + game.player.hull + "%")
        break;

      case "orbit":
        term.echo("<img src='orbit.png'>",{raw:true})
        break;

      case "orbit2":
        term.echo("<a href='orbit.png' download='test.png'><img src='orbit.png'></a>",{raw:true})
        term.echo("Test");
        break;

      case "goto":
        if(cmd.args[0]) {
          if(universe[cmd.args[0].toLowerCase()]) {
            game.player.location = cmd.args[0]
            term.echo("Moving to " + cmd.args[0])
          } else { term.echo("Invalid target") }
        } else { term.echo("Incorrect argument") }
        break;

      default:
        term.echo("[[;red;]Command not recognized]")
        //$.jrpc('test','foo','bar', console.log)
    }
  },
  options: {
    prompt: function(e) {game.setPrompt(e)},
    greetings: function(callback) {callback("Welcome to Jovian Week " + game.player.name)},
    onBlur: function() { return false },
    onAfterCommand: function(e) { game.save() },
    completion: function(terminal, string, callback) { callback(["help","balance","goto","orbit","status","scan"])},
    keydown: function(e, term) { if(game.blocked) return false;},
  },
  setPrompt: function(e) {
    e('[[;green;]'+game.player.status+']@[[;#777;]'+game.player.location+']>')
  },
  loop: function() {
    if(game.lastSave++ > 30) {
      game.lastSave = 0
      game.save()
    }
    if(universe[game.player.location].run) {
      universe[game.player.location].run(game.player);
    }
    setTimeout(game.loop, 500);
  }
} 

