var bodyParser = require('body-parser')

var _ = require('underscore');


// app.get('/', function(req, res){
//     res.send('Hello World');
// })

var express = require('express');
var app=express();
var router = require('./router/main')(app);

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.engine('html', require('ejs').renderFile);

var server = app.listen(3000, function(){
    console.log("Express server has started on port 3000")
});