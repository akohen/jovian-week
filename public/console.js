var game = {
  lastSave:0,
  interpreter: function(command, term) {
    const cmd = $.terminal.parse_command(command)
    switch(cmd.name) {
      case "help":
        term.echo("available commands:\n"
          +"  [[b;;]echo] <text> echo back first argument\n"
          +"  [[b;;]echoraw] <text> echo back first argument (raw text)\n"
          +"  [[b;;]scan] <body_id> show bodies\n"
          +"  [[b;;]balance]\n"
          +"  [[b;;]transfer] <body_id> plan and execute transfer between moons\n"
          +"  [[b;;]dock]\n"
          +"  [[b;;]undock]\n"
          +"  [[b;;]rpc] RPC calls to server\n"
          +"  [[b;;]test] pauses terminal\n"
          +"  [[b;;]status]\n"
          +"  [[b;;]orbit]\n"
          +"  [[b;;]orbit2] clickable!\n"
          +"  [[b;;]goto] <body_id> teleport to body");
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

      case "echoraw":
        term.echo(cmd.args[0],{raw:true});
        break;

      case "balance":
        term.echo("Current balance : ¥"+game.player.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        break;

      case "transfer":
        if(cmd.args[0] && universe[game.player.location].transfers && universe[game.player.location].transfers[cmd.args[0]]) {
          var transfer = universe[game.player.location].transfers[cmd.args[0]]
          term.echo("Transfer parameters :\n" + 
            "  Duration " + transfer.duration + " or " + game.orbit.timeInSeconds(transfer.duration) + " seconds"
            + "\n  Delta V required " + transfer.deltav + " m/s"
            + "\n  Synodic Period " + transfer.period);
          game.player.status = "transfering"
          game.player.transfer = transfer
          game.player.transfer.destination = cmd.args[0]
          game.player.transfer.arrival = Math.floor(Date.now() / 1000)+600
        } else {
          term.echo("No transfer to " + cmd.args[0] + " was found from here")
        }
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
        term.echo("Semi-major axis " + universe[game.player.location].sma + " m")
        term.echo("Fuel level " + game.player.deltav + "%")
        term.echo("Hull integrity " + game.player.hull + "%")
        if(game.player.status == "transfering") {
          term.echo("Transfer to " + game.player.transfer.destination + " underway")
          term.echo("  Time to destination : " + game.orbit.getRemainingTime(game.player.transfer.arrival))
        }
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
    onAfterCommand: function(e) { game.saveSystem.save() },
    completion: function(terminal, string, callback) { callback(["help","balance","goto","orbit","status","scan","transfer"])},
    keydown: function(e, term) { if(game.blocked) return false;},
  },
  setPrompt: function(e) {
    e('[[;green;]'+game.player.status+']@[[;#777;]'+game.player.location+']>')
  },
  loop: function() {
    game.currentTime = Math.floor(Date.now() / 1000)
    if(game.lastSave++ > 30) { // Autosave system
      game.lastSave = 0
      game.saveSystem.save()
    }

    if(universe[game.player.location].run) { // Run destination scripts ?
      universe[game.player.location].run(game.player);
    }

    if(game.player.transfer) { // Player transfer updates 
      if(game.player.transfer.arrival < game.currentTime) {
        game.player.location = game.player.transfer.destination
        game.player.transfer = null
        game.player.status = "orbiting"
        game.term.set_prompt(game.setPrompt)
      }
    }

    setTimeout(game.loop, 500); // Next loop in 500ms
  }
} 

