var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");

oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/myPageDAO_SQL.xml']);

module.exports = function(app){
	// 사용자 프로필 조회
	app.post("/selectMyProfile", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectMyProfile)",err);
			} else {
				console.log("Oracle Connection success(selectMyProfile)");
			}
			conn = con;

			var param = {
				sEmplyrSn : req.body.sEmplyrSn
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('MyPageDAO','selectMyProfile', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectMyProfile)>", err);
					doRelease(conn);
					return;
				}

				res.send(result.rows);
				doRelease(conn);					
			});  
		});

		function doRelease(conn){
			conn.close(function(err){
				if(err){
					console.log("doRelease error!");
					console.error(err.message);
				}
			})
		}
	})
}