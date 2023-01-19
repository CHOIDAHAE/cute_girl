var multer = require('multer');

var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = false;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/GroupDAO_SQL.xml']);

const fs = require('fs');

var storage = multer.diskStorage({
	destination(req, file, cb){
		cb(null, './public/uploadedGroupFiles/');
	},

	//파일 이름 지정 (저장시 파일명이 깨지는 경우가 있는데 다시 불러올 때 DB에 저장해둔 오리지널 파일명 가져오기)
	filename(req, file, cb){
		cb(null, `${Date.now()}_${file.originalname}`);
	},
});

var fileFilter = (req, file, cb) => {
	console.log(file);
	var fileType = file.originalname.split(".")[1];

	if(file.mimetype == "application/x-msdownload"){
		req.fileValidationError = "exe 파일은 업로드가 불가능합니다."
		return cb(null, false);
	}else{
		cb(null, true);
	}
}

var upload = multer({
	storage: storage,
	fileFilter : fileFilter
});

module.exports = function(app){
	// 그룹화면
	app.get('/group', function(req, res, next){
        res.render('./group/group');
    })
	
	// 그룹 업로드 팝업(iframe)
	app.get('/groupUpload', function(req, res, next){
		res.render('./group/groupUpload');
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

	/* 그룹 삭제 로직
	1. 해당 사용자가 올린 모든 파일은 삭제됨-그룹일련번호, 사용자일련번호필요
	2. 그룹 인원수 카운트해서 1이면 여부 N으로 업데이트-그룹일련번호
	3. 1이 아니면 리더여부 조회 -> 리더라면 다음 사용자(가입순)조회 -> 리더변경
	4. 그룹 테이블에서 내 일련번호 삭제하기
	*/
	app.post("/updateGroupUseAt", function(req, res){	
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(updateGroupUseAt)",err);
			} else {
				//console.log("Oracle Connection success(updateGroupUseAt)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			var param = {
				"emplyrSn"	: req.body.emplyrSn,
				"groupSn"	: req.body.groupSn
			}

			// 사용자가 올린 모든 파일 삭제
			let deleteGroupFile = mybatisMapper.getStatement('GroupDAO','deleteGroupFile', param, format);
			// 그룹 인원수 카운트
			let selecteGoupCnt = mybatisMapper.getStatement('GroupDAO','selecteGoupCnt', param, format);
			// 마지막 사용자인 경우 그룹삭제
			let updateGroupUseAt = mybatisMapper.getStatement('GroupDAO','updateGroupUseAt', param, format);
			// 리더여부 조회
			let selecteLeaderYn = mybatisMapper.getStatement('GroupDAO','selecteLeaderYn', param, format);
			// 등록일자 순으로 다음 리더 조회
			let selecteNextLeader = mybatisMapper.getStatement('GroupDAO','selecteNextLeader', param, format);
			
			//쿼리문 실행
			conn.execute(deleteGroupFile, function(err,result){
				if(err){
					console.log("deleteGroupFile failed :", err);
					res.json({"Status":"F"});
					return;
				}

				//그룹 인원수 카운트
				conn.execute(selecteGoupCnt, function(err,result){
					if(err){
						console.log("selecteGoupCnt failed :", err);
						res.json({"Status":"F"});
						return;
					}
					
					var cnt = result.rows[0][0];
					
					// 마지막 탈퇴자
					if(cnt == 1){
						// 마지막 사용자인 경우 그룹삭제
						conn.execute(updateGroupUseAt, function(err,result){
							if(err){
								console.log("updateGroupUseAt failed :", err);
								res.json({"Status":"F"});
								return;
							}

							// 개별 그룹 테이블에서 내 일련번호 삭제하기
							outGroup(res, req.body.emplyrSn, req.body.groupSn);						
						});
					} else {	// 다른 사용자가 더 남은 경우
						// 리더여부 조회
						conn.execute(selecteLeaderYn, function(err,result){
							if(err){
								console.log("selecteLeaderYn failed :", err);
								res.json({"Status":"F"});
								return;
							}

							var groupLeader = result.rows[0][0];
							
							if(groupLeader == 'N'){	//리더가 아닌경우
								// 개별 그룹 테이블에서 내 일련번호 삭제하기
								outGroup(res, req.body.emplyrSn, req.body.groupSn);

							} else {	// 리더인경우
								// 등록일자 순으로 다음 리더 조회
								conn.execute(selecteNextLeader, function(err,result){
									if(err){
										console.log("selecteNextLeader failed :", err);
										res.json({"Status":"F"});
										return;
									}
									// 그룹 리더 수정
									var nextParam = {
										"emplyrSn"	: req.body.emplyrSn,
										"groupSn"	: req.body.groupSn,
										"nextLeaderSn"	: result.rows[0][0]
									};

									// 그룹 리더 수정
									let updateGroupLeader = mybatisMapper.getStatement('GroupDAO','updateGroupLeader', nextParam, format);

									conn.execute(updateGroupLeader, function(err,result){
										if(err){
											console.log("updateGroupLeader failed :", err);
											res.json({"Status":"F"});
											return;
										}

										// 개별 그룹 테이블(TCM_EMPLYRBY_GROUP_AUTHOR)에서 내 일련번호 삭제하기
										outGroup(res, req.body.emplyrSn, req.body.groupSn);
									});
								});
							}
						});
					}
				
				});
				//conn.commit();
			});
		});
	})

	// 개별 그룹 테이블(TCM_EMPLYRBY_GROUP_AUTHOR)에서 내 일련번호 삭제하기
	function outGroup(res, emplyrSn, groupSn){
		//query format
		let format = {language: 'sql', indent: ''};

		var param = {
					"emplyrSn"	: emplyrSn,
					"groupSn"	: groupSn
				};

		// 모임 나가기 최종
		let outGroup = mybatisMapper.getStatement('GroupDAO','outGroup', param, format);

		conn.execute(outGroup, function(err,result){
			if(err){
				console.log("outGroup failed :", err);
				res.json({"Status":"F"});
				return;
			}
			
			res.json({"Status":"S"});
			conn.commit();
		});
	}

	/******************그룹 파일 업로드******************/
	// 그룹명 수정, 그룹 대표사진 수정
	app.post("/updateGroupSet", upload.single('groupImg'), function(req, res){	
		/*
		fs.readdir('../uploadedGroupFiles', (error) => {
			// uploads 폴더 없으면 생성
			if (error) {
				fs.mkdirSync('/uploadedGroupFiles');
			}
		});
		*/

		if(req.fileValidationError != null){
			res.json("exe");
			return;
		}
		
		//그냥 파일명을 가져올 경우 한글이 깨지는 오류 수정
		var fileNm = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
		var fileExt = req.file.originalname.split(".");

		var FILE_STRE_COURS_NM = '/uploadedGroupFiles';
		//var FILE_NM = fileNm;
		var ORGINL_FILE_NM = req.file.filename;
		//var FILE_EXTSN_NM = fileExt[fileExt.length - 1];
		//var FILE_MG = req.file.size;
		var emplyrSn = req.session.user.emplyrSn;
		//var ORGINL_FILE_EXTSN_NM = req.file.mimetype;
		
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
			
			var fileParam = {
							"groupSn"	: req.body.groupSn,
							"emplyrSn"	: emplyrSn
							}

			//기존 그룹사진 대표여부 수정
			let updateTopPicture = mybatisMapper.getStatement('GroupDAO','updateTopPicture', fileParam, format);
			//fileSn 찾아오기
			let selectFileSn = mybatisMapper.getStatement('GroupDAO','selectFileSn', {"groupSn"	: req.body.groupSn}, format);
			
			//기존 그룹사진 대표여부 수정
			conn.execute(updateTopPicture, function(err,result){
				if(err){
					console.log("updateTopPicture failed :", err);
					res.json({"Status":"F"});
					return;
				}

				//fileSn Max찾아오기
				conn.execute(selectFileSn, function(err,result){
					if(err){
						console.log("selectFileSn failed :", err);
						res.json({"Status":"F"});
						return;
					}
				
					var param = {
						"emplyrSn"		: emplyrSn,
						"fileSn"		: result.rows[0][0],
						"mainFileAt"	: 'Y',
						"groupSn"		: req.body.groupSn,
						"data"			: req.body.data,
						"orgFileNm"		: ORGINL_FILE_NM,
						"filePath"		: FILE_STRE_COURS_NM
					}

					//파일 등록
					let insertGroupFile = mybatisMapper.getStatement('GroupDAO','insertGroupFile', param, format);

					conn.execute(insertGroupFile, function(err,result){
						if(err){
							console.log(err);
							res.json("F");
						}
						
						// 제목 변경이 있는경우 업데이트
						if(req.body.data != "" && req.body.data != null){
							// 리더여부 조회
							let selecteLeaderYn = mybatisMapper.getStatement('GroupDAO','selecteLeaderYn', param, format);
							//내 그룹 업데이트
							let updateGroupNm = mybatisMapper.getStatement('GroupDAO','updateGroupNm', param, format);
							
							// 제목수정
							conn.execute(selecteLeaderYn, function(err,result){
								if(err){
									console.log("selecteLeaderYn failed :", err);
									res.json({"Status":"F"});
									return;
								}
								
								var leaderYn = result.rows[0][0];
								if( leaderYn == "N" ){	//리더 아님
									res.json({"Status":"L"});
									return;
								} else {
									//쿼리문 실행
									conn.execute(updateGroupNm, function(err,result){
										if(err){
											console.log("updateGroupNm failed :", err);
											res.json({"Status":"F"});
											return;
										}
										res.json({"Status":"S"});
										
										conn.commit();
									});
								}
							});
						} else {// 제목 없는 경우 바로 커밋
							res.json({"Status":"S"});
							
							conn.commit();
						}
					});
				});
			});
		});
	})

	// 대표사진 조회
	app.post("/selectedGroupInfo", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectedGroupInfo)",err);
			} else {
				//console.log("Oracle Connection success(selectedGroupInfo)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let selectTopPicture = mybatisMapper.getStatement('GroupDAO','selectTopPicture', { "groupSn" : req.body.groupSn}, format);

			//쿼리문 실행
			conn.execute(selectTopPicture, function(err,result){
				if(err){
					console.log("selectedGroupInfo failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
				doRelease(conn);					
			});  
		});
	})

	// 그룹 업로드용 내 파일 리스트 읽어오기
	app.post("/myPictureList", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(myPictureList)",err);
			} else {
				console.log("Oracle Connection success(myPictureList)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				"emplyrSn" : req.body.emplyrSn
			};

			//쿼리
			let selectPictureList = mybatisMapper.getStatement('GroupDAO','selectPictureList', param, format);

			//쿼리문 실행
			conn.execute(selectPictureList, function(err,result){
				if(err){
					console.log("selectPictureList failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
				doRelease(conn);					
			});  
		});
	})

	// 그룹 첨부하기
	app.post("/groupUpload", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(groupUpload)",err);
			} else {
				console.log("Oracle Connection success(groupUpload)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				"emplyrSn" : req.body.emplyrSn
			};

			//쿼리
			let groupUpload = mybatisMapper.getStatement('GroupDAO','groupUpload', param, format);

			//쿼리문 실행
			conn.execute(groupUpload, function(err,result){
				if(err){
					console.log("groupUpload failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
				doRelease(conn);					
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