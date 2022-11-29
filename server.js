var bodyParser = require('body-parser');

var _ = require('underscore');

var express = require('express');
var app=express();
var fileRouter = express.Router();
var router = require('./router/main')(app);
var dbRouter = require('./router/dbConn')(app);
var dbRouter = require('./router/login')(app);
var fileRouter = require('./router/file')(app);
var settingRouter = require('./router/setting')(app);

var fs = require('fs');

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.engine('html', require('ejs').renderFile);

var server = app.listen(3000, function(){
    //existsSync() 폴더가 있는지 확인 후 없으면 mkdirSync() 통해 폴더 생성
    var dir = './public/uploadedFiles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    console.log("Express server has started on port 3000")
});