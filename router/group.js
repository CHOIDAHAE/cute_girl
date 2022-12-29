var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/GroupDAO_SQL.xml']);

module.exports = function(app){
   // 전체 파일 용량 읽어오기
	app.post("/insertNewGroup", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(insertNewGroup)",err);
			} else {
				console.log("Oracle Connection success(insertNewGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};
			var sample = { "test" : "1" };

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('GroupDAO','selectGroupSn', sample, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				if(err){
					console.log("selectGroupSn failed :", err);
					doRelease(conn);
					return;
				}

				var param = {
					groupSn	: result.rows[0][0],
					emplyrSn : req.body.emplyrSn,
					groupNm : req.body.groupNm,
					useAt : req.body.useAt
				}

				let query = mybatisMapper.getStatement('GroupDAO','insertNewGroup', param, format);

				//쿼리문 실행
				conn.execute(query, function(err,result){
					if(err){
						console.log("insertNewGroup failed :", err);
						res.json("F");
						doRelease(conn);
						return;
					}
					res.json("S");
					doRelease(conn);					
				});
			});  
		});
	})

	function doRelease(conn){
		conn.close(function(err){
			if(err){
				console.log("doRelease error!");
				console.error(err.message);
			}
		})
	}
}