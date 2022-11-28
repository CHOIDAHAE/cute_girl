var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/IndexDAO_SQL.xml']);

module.exports = function(app){
    app.get('/setting', function(req, res, next){
        res.render('./setting/setting');
    })

    app.get('/settingMain', function(req, res, next){
        res.render('./setting/settingMain');
    })

    app.get('/settingMyPage', function(req, res, next){
        res.render('./setting/settingMyPage');
    })
}