var express = require('express');
var bodyParser = require('body-parser')
var app = express();


app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));


app.get('/', function (req, res) {
  res.sendFile('console.html' , { root : __dirname});
});

app.post('/test', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  console.log(req.body)
  if(req.body.method == "login") {
    console.log("login attempt")
    res.send(JSON.stringify({ jsonrpc: '2.0', result:'logged', id:req.body.id }));
  } else {
    res.send(JSON.stringify({ jsonrpc: '2.0', result:'pong', error:{message:'wat?'} }));
  }
});


var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on port ' + listener.address().port);
});
