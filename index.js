var express = require('express');
var app = express();
var compression = require('compression');

app.use(compression({ threshold: 0 }));
app.use('/', express.static('demo'));

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});