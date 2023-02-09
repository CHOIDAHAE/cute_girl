var multer = require('multer');

var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = false;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/GroupDAO_SQL.xml']);
mybatisMapper.createMapper( ['./mapper/IndexDAO_SQL.xml']);

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
		res.render('./group/groupUpload', {"popType" : req.query.popType});
	})

  	// 새 모임 추가하기
	app.post("/insertNewGroup", upload.single('groupImg'),  function(req, res){
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

			//그룹 일련번호 조회
			let selectGroupSn = mybatisMapper.getStatement('GroupDAO','selectGroupSn', {}, format);

			//쿼리문 실행
			conn.execute(selectGroupSn, function(err,result){
				if(err){
					console.log("selectGroupSn failed :", err);
					doRelease(conn);
					return;
				}
				
				var groupSn = result.rows[0][0];
				var param = {
					groupSn	: groupSn,
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
					})
					
					// 파일이 있으면 파일 업로드
					if(typeof req.file != 'undefined'){
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
						//var fileNm = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
						// var fileExt = req.file.originalname.split(".");

						var FILE_STRE_COURS_NM = '/uploadedGroupFiles';
						//var FILE_NM = fileNm;
						var ORGINL_FILE_NM = req.file.filename;
						//var FILE_EXTSN_NM = fileExt[fileExt.length - 1];
						//var FILE_MG = req.file.size;
						//var ORGINL_FILE_EXTSN_NM = req.file.mimetype;

						//fileSn 찾아오기
						let selectFileSn = mybatisMapper.getStatement('GroupDAO','selectFileSn', {"groupSn"	: groupSn}, format);

						//fileSn Max찾아오기
						conn.execute(selectFileSn, function(err,result){
							if(err){
								console.log("selectFileSn failed :", err);
								res.json({"Status":"F"});
								return;
							}
						
							var param = {
								"emplyrSn"		: req.session.user.emplyrSn,
								"fileSn"		: result.rows[0][0],
								"mainFileAt"	: 'Y',
								"groupSn"		: groupSn,
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
								// 커밋
								conn.commit();

								res.json("S");
								
							})
						})
					} else {
						// 커밋
						conn.commit();

						res.json("S");
					}
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
			console.log("**********************************");
			console.log(selectedGouprSn);
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

				//doRelease(conn);
			});
		});
	})

	/* 그룹 삭제 로직
	1. 해당 사용자가 올린 모든 파일은 삭제됨-그룹일련번호, 사용자일련번호필요
	2. 그룹 인원수 카운트해서 1이면 여부 N으로 업데이트-그룹일련번호
	3. 1이 아니면 리더여부 조회 -> 리더라면 다음 사용자(가입순)조회 -> 리더변경
	4. 그룹 테이블에서 내 일련번호 삭제하기
	5. 타임라인 삭제
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
						console.log('마지막 탈퇴자');
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
						console.log('다른 사용자가 더 남은 경우');
						// 리더여부 조회
						conn.execute(selecteLeaderYn, function(err,result){
							if(err){
								console.log("selecteLeaderYn failed :", err);
								res.json({"Status":"F"});
								return;
							}

							var groupLeader = result.rows[0][0];
							
							if(groupLeader == 'N'){	//리더가 아닌경우
								console.log('리더가 아닌경우');
								// 개별 그룹 테이블에서 내 일련번호 삭제하기
								outGroup(res, req.body.emplyrSn, req.body.groupSn);

							} else {	// 리더인경우
								console.log('리더인경우');
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
									console.log('그룹 리더 수정----------------------');
									console.log(updateGroupLeader);
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
		// 타임라인 삭제
		let deleteTimeline = mybatisMapper.getStatement('GroupDAO','deleteTimeline', param, format);
		
		conn.execute(outGroup, function(err,result){
			if(err){
				console.log("outGroup failed :", err);
				res.json({"Status":"F"});
				return;
			}

			conn.execute(deleteTimeline, function(err,result){
				if(err){
					console.log("deleteTimeline failed :", err);
					res.json({"Status":"F"});
					return;
				}

				res.json({"Status":"S"});
				conn.commit();
			});			
		});
	}

	/******************그룹 파일 업로드******************/
	// 그룹명 수정, 그룹 대표사진 수정
	app.post("/updateGroupSet", upload.single('groupImg'), function(req, res){			
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

			// 파일이 있으면 파일 업로드 및 제목 수정
			if(typeof req.file != 'undefined'){
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
				//var fileNm = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
				// var fileExt = req.file.originalname.split(".");

				var FILE_STRE_COURS_NM = '/uploadedGroupFiles';
				//var FILE_NM = fileNm;
				var ORGINL_FILE_NM = req.file.filename;
				//var FILE_EXTSN_NM = fileExt[fileExt.length - 1];
				//var FILE_MG = req.file.size;
				//var ORGINL_FILE_EXTSN_NM = req.file.mimetype;

				var fileParam = {
								"groupSn"	: req.body.groupSn,
								"emplyrSn"	: req.session.user.emplyrSn
								}

				//기존 그룹사진 삭제
				let deleteTopPicture = mybatisMapper.getStatement('GroupDAO','deleteTopPicture', fileParam, format);
				//fileSn 찾아오기
				let selectFileSn = mybatisMapper.getStatement('GroupDAO','selectFileSn', {"groupSn"	: req.body.groupSn}, format);
				
				//기존 그룹사진 삭제
				conn.execute(deleteTopPicture, function(err,result){
					if(err){
						console.log("deleteTopPicture failed :", err);
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
							"emplyrSn"		: req.session.user.emplyrSn,
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
								console.log(param);
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
			} else if(req.body.data != "" && req.body.data != null){
				var param = {
					"emplyrSn"		: req.session.user.emplyrSn,
					"data"			: req.body.data,
					"groupSn"		: req.body.groupSn
				}
				
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
			} else {	// 사진도 제목도 없는 경우
				res.json({"Status":"Q"});
			}
		});
	})

	// 대표사진 및 그룹정보(그룹명, 가입일자 등) 조회
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

			var param = {"groupSn" : req.body.groupSn};

			// 대표사진 조회
			let selectTopPicture = mybatisMapper.getStatement('GroupDAO','selectTopPicture', param, format);
			// 그룹 정보 조회
			let selectGroupInfo = mybatisMapper.getStatement('GroupDAO','selectGroupInfo', param, format);

			//쿼리문 실행
			conn.execute(selectTopPicture, function(err,result){
				if(err){
					console.log("selectedGroupInfo failed :", err);
					res.json({"Status":"F"});
					return;
				}

				var originalname = "";

				// 대표사진이 있는경우
				if(result.rows.length > 0){
					originalname = result.rows[0][0];
				}
				
				conn.execute(selectGroupInfo, function(err,resul){
					if(err){
						console.log("selectGroupInfo failed :", err);
						res.json({"Status":"F"});
						return;
					}

					res.json({
							"Status"		: "S",
							"originalname"	: originalname,
							"groupNm"		: resul.rows[0][0],
							"frstRegistDt"	: resul.rows[0][1],
							"leaderNm"		: resul.rows[0][2],
						});

					//doRelease(conn);					
				}); 					
			});  
		});
	})

	// 가입멤버 조회
	app.post("/selectGropMember", function(req, res){
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
				"groupSn"	: req.body.groupSn
			};

			let selectGropMember = mybatisMapper.getStatement('GroupDAO','selectGropMember', param, format);

			//쿼리문 실행
			conn.execute(selectGropMember, function(err,result){
				if(err){
					console.log("selectGropMember failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
				//doRelease(conn);
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
				"emplyrSn"	: req.body.emplyrSn,
				"groupSn"	: req.body.groupSn,
				"popType"	: req.body.popType,
			};

			let query = "";

			//쿼리
			if (req.body.type == "BK"){	// 즐겨찾기
				query = mybatisMapper.getStatement('GroupDAO','selectBkmkPictureList', param, format);
			} else {	//전체
				query = mybatisMapper.getStatement('GroupDAO','selectPictureList', param, format);
			}

			//쿼리문 실행
			conn.execute(query, function(err,result){
				if(err){
					console.log("query failed :", err);
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
				//console.log("Oracle Connection success(groupUpload)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			var fileSn = req.body.fileSnList.split(",");
			for(var i=1; i<fileSn.length; i++){
				var param = {
					"emplyrSn"	: req.body.emplyrSn,
					"fileSn"	: fileSn[i]
				};
				
				// 파일 상세정보 조회 (한건당 상세조회 해서 그걸 group_file 테이블에 insert)
				let picturesForUpload = mybatisMapper.getStatement('GroupDAO','picturesForUpload', param, format);
				
				// 쿼리문 실행
				conn.execute(picturesForUpload, function(err,result){
					if(err){
						console.log("picturesForUpload failed :", err);
						res.json({"Status":"F"});
						return;
					}

					var insertParam = {
						"emplyrSn"	: req.body.emplyrSn,
						"groupSn"	: req.body.groupSn,
						"fileSn"	: result.rows[0][0],
						"mainFileAt": "N",
						"filePath"	: result.rows[0][1],
						"orgFileNm"	: result.rows[0][2]
					};

					// 그룹파일에 insert
					let insertGroupFile = mybatisMapper.getStatement('GroupDAO','insertGroupFile', insertParam, format);
					
					conn.execute(insertGroupFile, function(err,res){
						if(err){
							console.log("insertGroupFile failed :", err);
							res.json({"Status":"F"});
							return;
						}

						var timelineParam = {
									"emplyrSn"		: req.body.emplyrSn,
									"groupSn"		: req.body.groupSn,
									//"timelineDc"	: req.body.timelineDc,
									"type"			: req.body.type,
									"fileSn"		: result.rows[0][0]
											};
						// 그룹파일에 insert
						let insertTimeline = mybatisMapper.getStatement('GroupDAO','insertTimeline', timelineParam, format);

						conn.execute(insertTimeline, function(err,result){
							if(err){
								console.log("insertTimeline failed :", err);
								res.json({"Status":"F"});
								return;
							}
	
							conn.commit();
						});
					});
				});
			}
			res.json({"Status":"S"});
		});
	})

	// 댓글달기
	app.post("/insertComment", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectForGroup)",err);
			} else {
				//console.log("Oracle Connection success(selectForGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			let param = {
					"groupSn"		: req.body.groupSn,
					"timelineSn"	: req.body.timelineSn,
					"commentDc"		: req.body.commentDc,
					"emplyrSn"		: req.session.user.emplyrSn
				};

			// 그룹파일에 insert
			let insertComment = mybatisMapper.getStatement('GroupDAO','insertComment', param, format);

			conn.execute(insertComment, function(err,result){
				if(err){
					console.log("insertComment failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S"});
				conn.commit();
			});
		});	
	})

	// 댓글 조회
	app.post("/selectComment", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectForGroup)",err);
			} else {
				//console.log("Oracle Connection success(selectForGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			// 댓글 조회
			let selectComment = mybatisMapper.getStatement('GroupDAO','selectComment', {"groupSn" : req.body.groupSn}, format);

			conn.execute(selectComment, function(err,result){
				if(err){
					console.log("selectComment failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
			});
		});	
	})

	// 그룹사진 조회
	app.post("/selectForGroup", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectForGroup)",err);
			} else {
				//console.log("Oracle Connection success(selectForGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			// 그룹사진 조회
			let selectForGroup = mybatisMapper.getStatement('GroupDAO','selectForGroup', {"groupSn" : req.body.groupSn}, format);

			conn.execute(selectForGroup, function(err,result){
				if(err){
					console.log("selectForGroup failed :", err);
					res.json({"Status":"F"});
					return;
				}
				
				res.json({"Status":"S", "result" : result.rows});
				//conn.commit();
			});
		});	
	})

	// 초대한 그룹에 가입하기
	app.post("/insertInvitedGroup", function(req, res){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(insertInvitedGroup)",err);
			} else {
				//console.log("Oracle Connection success(insertInvitedGroup)");
			}
			conn = con;

			//query format
			let format = {language: 'sql', indent: ''};

			var data = {
						"groupSn"	: req.body.groupSn,
						"emplyrSn"	: req.body.emplyrSn,
						"type"		: 'join',
						"fileSn"	: ''
					};

			// 그룹파일에 insert
			let groupJoinAt = mybatisMapper.getStatement('GroupDAO','groupJoinAt', data, format);
			let insertPersonalGroup = mybatisMapper.getStatement('GroupDAO','insertPersonalGroup', data, format);
			let insertTimeline = mybatisMapper.getStatement('GroupDAO','insertTimeline', data, format);
				
			conn.execute(groupJoinAt, function(err,result){
				if(err){
					console.log("groupJoinAt failed :", err);
					res.json({"Status":"F"});
					return;
				}

				if(result.rows[0][0] > 0){	// 이미 가입되어 있는 경우
					res.json({"Status":"A"});
				} else {	// 신규가입인 경우
					conn.execute(insertPersonalGroup, function(err,result){
						if(err){
							console.log("insertPersonalGroup failed :", err);
							res.json({"Status":"F"});
							return;
						}

						// 타임라인 테이블에도 추가 (type:join)
						conn.execute(insertTimeline, function(err,result){
							if(err){
								console.log("insertTimeline failed :", err);
								res.json({"Status":"F"});
								return;
							}
							
							res.json({"Status":"S", "result" : result.rows});
							conn.commit();
						});						
					});
				}
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