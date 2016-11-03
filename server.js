var express = require('express');
var bodyParser = require('body-parser')
var app = express();


app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));


app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/test', function (req, res) {
  res.send(JSON.stringify({ jsonrpc: '2.0', result:'pong', error:{message:'wat?'} }));
  console.log(req.params)
  console.log(req.body)
});


app.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});
