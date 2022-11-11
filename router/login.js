var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/UserDAO_SQL.xml']);

module.exports = function(app){
	app.get('/join', function(req, res){
        res.render('join', {data:'join'});
    })

    app.get('/login', function(req, res){
        res.render('login', {data:'login'});
    })

	app.get('/logout', function(req, res){
        res.render('login', {data:'login'});
    })	
}