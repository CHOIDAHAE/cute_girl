var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = false;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/GroupDAO_SQL.xml']);

module.exports = function(app){
	// 그룹화면
	app.get('/group', function(req, res, next){
        res.render('./group/group');
    })

  	// 새 모임 추가하기
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
			let selectGroupSn = mybatisMapper.getStatement('GroupDAO','selectGroupSn', sample, format);

			//쿼리문 실행
			conn.execute(selectGroupSn, function(err,result){
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

				let NewGroupQ = mybatisMapper.getStatement('GroupDAO','insertNewGroup', param, format);

				//쿼리문 실행
				conn.execute(NewGroupQ, function(err,result){
					if(err){
						console.log("insertNewGroup failed :", err);
						res.json("F");
						doRelease(conn);
						return;
					}

					let personalGroupQ = mybatisMapper.getStatement('GroupDAO','insertPersonalGroup', param, format);

					//쿼리문 실행
					conn.execute(personalGroupQ, function(err,result){
						if(err){
							console.log("insertPersonalGroup failed :", err);
							res.json("F");
							doRelease(conn);
							return;
						}
						// 커밋
						conn.commit();
					})
					res.json("S");
					
					//doRelease(conn);	
				});
			});
		});
	})

	// 내 모임 조회하기
	app.post("/selectMyGroup", function(req, res, next){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectMyGroup)",err);
			} else {
				//console.log("Oracle Connection success(selectMyGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			//내 그룹 조회
			let selectMyGroup = mybatisMapper.getStatement('GroupDAO','selectMyGroup', {"emplyrSn":req.body.emplyrSn}, format);

			//쿼리문 실행
			conn.execute(selectMyGroup, function(err,result){
				if(err){
					console.log("selectMyGroup failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json(result.rows);
				
				doRelease(conn);
			});
		});
	})

	// 선택된 그룹 일련번호
	app.post("/selectedGouprSn", function(req, res, next){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectedGouprSn)",err);
			} else {
				//console.log("Oracle Connection success(selectedGouprSn)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			var param = {
				"emplyrSn"	: req.body.emplyrSn,
				"num"		: req.body.num
			}

			//내 그룹 조회
			let selectedGouprSn = mybatisMapper.getStatement('GroupDAO','selectedGouprSn', param, format);

			//쿼리문 실행
			conn.execute(selectedGouprSn, function(err,result){
				if(err){
					console.log("selectMyGroup failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				// 그룹정보 넘기기
				res.json({
							"groupSn"	: result.rows[0][0],
							"groupNm"	: result.rows[0][1],
							"emplyrNm"	: result.rows[0][2],
							"emplyrId"	: result.rows[0][3]
						});

				doRelease(conn);
			});
		});
	})

	// 그룹 삭제(해당 사용자가 올린 모든 파일은 삭제됨, 리더-그룹사용여부N, 모든사용자-그룹사용여부Y)
	app.post("/updateGroupUseAt", function(req, res){	

	})

	// 그룹명 수정, 그룹 대표사진 수정
	app.post("/updateGroupSet", function(req, res){	
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(updateGroupSet)",err);
			} else {
				//console.log("Oracle Connection success(updateGroupSet)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			var param = {
				"emplyrSn"	: req.body.emplyrSn,
				"groupSn"	: req.body.groupSn,
				"data"		: req.body.data
			}

			//내 그룹 조회
			let updateGroupNm = mybatisMapper.getStatement('GroupDAO','updateGroupNm', param, format);

			//쿼리문 실행
			conn.execute(updateGroupNm, function(err,result){
				if(err){
					console.log("updateGroupNm failed :", err);
					res.json({"Status":"F"});
					return;
				}
				res.json({"Status":"S"});

				// 대표사진 추가 쿼리 실행 시점 
				
				conn.commit();
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