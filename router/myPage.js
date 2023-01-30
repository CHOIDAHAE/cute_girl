var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");

oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');
var crypto = require('crypto');

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
	})

	//프로필 저장하기
	app.post('/saveProfile', function(req, res){
		console.log("saveProfile");
		
		var sEmplyrSn = req.body.sEmplyrSn;
		var emplyrNm = req.body.emplyrNm;
		var emplyrId = req.body.emplyrId;
		var emailAdres = req.body.emailAdres;

		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/saveProfile)",err);
			} else {
				console.log("Oracle Connection success(/saveProfile)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : sEmplyrSn,
				emplyrNm : emplyrNm,
				emplyrId : emplyrId,
				emailAdres : emailAdres
			}

			let query = mybatisMapper.getStatement('MyPageDAO','updateMyProfile', param, format);
			conn.execute(query, function(err,result){
				console.log("MyPageDAO.updateMyProfile");
				console.log(query);
				if(err){
					console.log(err);
					res.json("F");
				}
				conn.commit();
			});
			res.json({"emplyrSn":req.session.user.emplyrSn});
			// doRelease(conn);
		});
	});

	//비밀번호 확인
	app.post("/checkPasswd", function(req, res){
		var sEmplyrSn = req.body.sEmplyrSn;
		var passwd = req.body.passwd;
		var salt = "";
		var org_passwd = "";

		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(checkPasswd)",err);
			} else {
				console.log("Oracle Connection success(checkPasswd)");
			}
			conn = con;

			var param = {
				sEmplyrSn : req.body.sEmplyrSn
				, passwd : req.body.passwd
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('MyPageDAO','selectSalt', param, format);

			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(checkPasswd)>", err);
					doRelease(conn);
					return;
				}

				console.log(result.rows);
				salt = result.rows[0][0];
				org_passwd = result.rows[0][1];

				var hashPassword = crypto.createHash("sha256").update(passwd + salt).digest("hex");
			
				if(hashPassword == org_passwd){
					res.send("true");
				}else{
					res.send("false");
				}
			}); 

			doRelease(conn);
		});
	})

	// 비밀번호 재설정
	app.post("/updatePasswd", function(req, res, next){
		var sEmplyrSn = req.body.sEmplyrSn;
		var emplyrPasswd = req.body.emplyrPasswd;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/updatePasswd)",err);
			} else {
				console.log("Oracle Connection success(/updatePasswd)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};			
			
			var salt = Math.round((new Date().valueOf() * Math.random()))+"";
			var hashPassword = crypto.createHash("sha256").update(emplyrPasswd + salt).digest("hex");

			var param = {
				sEmplyrSn,
				emplyrPasswd : hashPassword,
				salt : salt
			}

			//insert
			let InstQuery = mybatisMapper.getStatement('MyPageDAO','updatePasswd', param, format);

			//쿼리문 실행(insert)
			conn.execute(InstQuery, function(err,result){
				console.log(InstQuery);
				if(err){
					console.log("JOIN failed "+err);
					res.json("F");
				}
				conn.commit();
				res.json("S");
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