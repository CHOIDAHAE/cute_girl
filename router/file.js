var multer = require('multer');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");

oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');
const { compact } = require('underscore');
const { Callbacks } = require('jquery');

const fs = require('fs');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/UserDAO_SQL.xml']);

var storage = multer.diskStorage({
    destination(req, file, cb){
        cb(null, './public/uploadedFiles/');
    },

    //파일 이름 지정 (저장시 파일명이 깨지는 경우가 있는데 다시 불러올 때 DB에 저장해둔 오리지널 파일명 가져오기)
    filename(req, file, cb){
		var orgfileNm = Buffer.from(file.originalname, 'latin1').toString('utf8')
        cb(null, `${Date.now()}_${orgfileNm}`);
    },
});

var fileFilter = (req, file, cb) => {
	console.log("fileFilter >>>> ");
	console.log(file);
	var fileType = file.originalname.split(".")[1];

	if(file.mimetype == "application/x-msdownload"){
		console.log("exe");
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
	var conn;

    app.get('/', function(req, res){
        res.render('upload');
    });
    
	//파일 등록
    app.post('/uploadFile', upload.single('attachment'), function(req, res){
		console.log("uploadFiles");
		
		if(req.fileValidationError != null){
			res.json("exe");
			return;
		}
		
		//그냥 파일명을 가져올 경우 한글이 깨지는 오류 수정
		var fileNm = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
		var fileExt = req.file.originalname.split(".");

		var FILE_STRE_COURS_NM = '/uploadedFiles';
		var FILE_NM = fileNm;
		var ORGINL_FILE_NM = req.file.filename;
		var FILE_EXTSN_NM = fileExt[fileExt.length - 1];
		var FILE_MG = req.file.size;
		var emplyrSn = req.session.user.emplyrSn;
		var ORGINL_FILE_EXTSN_NM = req.file.mimetype;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/uploadFile)",err);
			} else {
				console.log("Oracle Connection success(/uploadFile)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			//fileSn 찾아오기
			let query = mybatisMapper.getStatement('IndexDAO','selectFileSn', {}, format);
			
			conn.execute(query, function(err,result){
				console.log("IndexDAO.selectFileSn");
				console.log(query);

				if(err){
					console.log("파일 일련번호 찾기를 실패했습니다.");
					res.json("F");
				} else {
					var param = {
						filePath : FILE_STRE_COURS_NM
						, fileNm : FILE_NM
						, orgFileNm : ORGINL_FILE_NM
						, fileExtsnNm : FILE_EXTSN_NM
						, fileSize : FILE_MG
						, emplyrSn : emplyrSn
						, fileSn : result.rows[0][0]
						, orgFileExtsnNm : ORGINL_FILE_EXTSN_NM
					}

					//파일 등록
					query = mybatisMapper.getStatement('IndexDAO','insertAtchFileDtl', param, format);
					conn.execute(query, function(err,result){
						console.log("IndexDAO.insertAtchFileDtl");
						console.log(query);

						if(err){
							console.log("fileDtl Insert failed "+err);
							res.json("F");
						}
						conn.commit();
					});
				}
				//doRelease(conn);
			});
		});

		res.json({"emplyrSn":req.session.user.emplyrSn});
	});

	// 파일 리스트 읽어오기
	app.post("/selectFileList", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectFileList)",err);
			} else {
				console.log("Oracle Connection success(selectFileList)");
			}
			conn = con;

			var param = {
				emplyrSn : req.body.emplyrSn
				, useAt : req.body.useAt
				, fileType : req.body.fileType
				, orderBy : req.body.orderBy
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectFileList', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectFileList)>", err);
					doRelease(conn);
					return;
				}

				res.send(result.rows);
				doRelease(conn);					
			});  
		});
	})

	// 파일 정보 읽어오기
	app.post("/selectFileDtlData", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectFileDtlData)",err);
			} else {
				console.log("Oracle Connection success(selectFileDtlData)");
			}
			conn = con;

			var param = {
				AtchfileSn : req.body.AtchfileSn
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectFileDtlData', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectFileDtlData)>", err);
					doRelease(conn);
					return;
				}
				
				res.send(result.rows);
				doRelease(conn);					
			});  
		});
	})

	//파일 휴지통으로 보내기 / 복원
	app.post('/updateFileUseAt', upload.single('attachment'), function(req, res){
		console.log("updateFileUseAt");
		
		var useAt = req.body.useAt;
		var AtchfileSnArr = req.body.AtchfileSn;
		var emplyrSn = req.session.user.emplyrSn;

		console.log(AtchfileSnArr);
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/updateFileUseAt)",err);
			} else {
				console.log("Oracle Connection success(/updateFileUseAt)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};

			for(var i=0; i<AtchfileSnArr.length; i++){
				var param = {
					useAt : useAt
					, emplyrSn : emplyrSn
					, AtchfileSn : AtchfileSnArr[i]
				}

				console.log(param);
	
				let query = mybatisMapper.getStatement('IndexDAO','updateFileUseAt', param, format);
				conn.execute(query, function(err,result){
					console.log("IndexDAO.updateFileUseAt");
					console.log(query);
					if(err){
						console.log(err);
						res.json("F");
					}
				});
	
				//그룹에 저장된 파일 삭제
				query = mybatisMapper.getStatement('IndexDAO','deleteGroupFile', param, format);
				conn.execute(query, function(err,result){
					console.log("IndexDAO.deleteGroupFile");
					console.log(query);
					if(err){
						console.log(err);
						res.json("F");
					}
				});
			}
			
			conn.commit();
			res.json({"emplyrSn":req.session.user.emplyrSn});
			//doRelease(conn);
		});
	});

	//파일 완전 삭제
	app.post('/deleteFileUseAt', upload.single('attachment'), function(req, res){
		console.log("deleteFileUseAt");
		
		var AtchfileSn = req.body.AtchfileSn;
		var emplyrSn = req.session.user.emplyrSn;

		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/deleteFileUseAt)",err);
			} else {
				console.log("Oracle Connection success(/deleteFileUseAt)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				emplyrSn : emplyrSn
				, AtchfileSn : AtchfileSn
			}

			let query = mybatisMapper.getStatement('IndexDAO','selectFileDtlData', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.selectFileDtlData");
				console.log(query);
				if(err){
					console.log(err);
					res.json("F");
				}

				var orgnFileNm = result.rows[0][5];
				
				fs.unlink(`./public/uploadedFiles/${orgnFileNm}`, function(err){
					if(err != null){
						console.log('파일 삭제 에러!!');
						console.log("er : ", err);
						res.json("F");
					}
				})
			});
			
			query = mybatisMapper.getStatement('IndexDAO','deleteFileUseAtDtl', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.deleteFileUseAtDtl");
				console.log(query);
				if(err){
					console.log(err);
					res.json("F");
				}
				conn.commit();
			});

			res.json({"emplyrSn":req.session.user.emplyrSn});
			//doRelease(conn);
		});
	});

	//파일명 수정
	app.post('/updateFileNm', function(req, res){
		console.log("updateFileNm");

		var atchmnflSn = req.body.atchmnflSn;
		var fileNm = req.body.fileNm;
		var sEmplyrSn = req.body.sEmplyrSn;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/updateFileNm)",err);
			} else {
				console.log("Oracle Connection success(/updateFileNm)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : sEmplyrSn
				, atchmnflSn : atchmnflSn
				, fileNm : fileNm
			}

			let query = mybatisMapper.getStatement('IndexDAO','updateFileNm', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.updateFileNm");
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

	//즐겨찾기 추가
	app.post('/insertBmFavorite', function(req, res){
		console.log("insertBmFavorite");
		
		var AtchfileSn = req.body.AtchfileSn;
		var emplyrSn = req.session.user.emplyrSn;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/insertBmFavorite)",err);
			} else {
				console.log("Oracle Connection success(/insertBmFavorite)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : emplyrSn
				, atchmnflSn : AtchfileSn
			}

			let query = mybatisMapper.getStatement('IndexDAO','insertBmFavorite', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.insertBmFavorite");
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

	//즐겨찾기 삭제
	app.post('/deleteBmFavorite', function(req, res){
		console.log("deleteBmFavorite");
		console.log(req.session.user);
		
		var AtchfileSn = req.body.AtchfileSn;
		var emplyrSn = req.session.user.emplyrSn;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/deleteBmFavorite)",err);
			} else {
				console.log("Oracle Connection success(/deleteBmFavorite)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : emplyrSn
				, atchmnflSn : AtchfileSn
			}

			let query = mybatisMapper.getStatement('IndexDAO','deleteBmFavorite', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.deleteBmFavorite");
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

	// 즐겨찾기 목록 조회
	app.post("/selectBkmkList", function(req, res){		
		var emplyrSn = req.session.user.emplyrSn;
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectBkmkList)",err);
			} else {
				console.log("Oracle Connection success(selectBkmkList)");
			}
			conn = con;

			var param = {
				sEmplyrSn : emplyrSn
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectBkmkList', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectBkmkList)>", err);
					doRelease(conn);
					return;
				}
				
				res.send(result.rows);
				doRelease(conn);					
			});  
		});
	})

	//자동삭제 추가
	app.post('/updateAutoFileInfo', function(req, res){
		console.log("updateAutoFileInfo");
		
		var sEmplyrSn = req.session.user.emplyrSn;
		var autoDeleteInfo = req.body.autoDeleteInfo;

		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/updateAutoFileInfo)",err);
			} else {
				console.log("Oracle Connection success(/updateAutoFileInfo)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : sEmplyrSn
				, autoDeleteInfo : autoDeleteInfo
			}

			let query = mybatisMapper.getStatement('IndexDAO','updateAutoFileInfo', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.updateAutoFileInfo");
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

	//자동삭제여부 조회
	app.post("/selectAutoFileInfo", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectAutoFileInfo)",err);
			} else {
				console.log("Oracle Connection success(selectAutoFileInfo)");
			}
			conn = con;

			var param = {
				sEmplyrSn : req.session.user.emplyrSn
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectAutoFileInfo', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectAutoFileInfo)>", err);
					doRelease(conn);
					return;
				}
				
				res.send(result.rows);
				doRelease(conn);					
			});  
		});
	});

	//자동삭제
	app.post('/deleteAutoFile', function(req, res){
		console.log("deleteAutoFile");
		console.log(req.session.user);
		
		var sEmplyrSn = req.session.user.emplyrSn;
		var autoDeleteInfo = req.body.autoDeleteInfo;

		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/deleteAutoFile)",err);
			} else {
				console.log("Oracle Connection success(/deleteAutoFile)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			var param = {
				sEmplyrSn : sEmplyrSn
			}

			let query = mybatisMapper.getStatement('IndexDAO','deleteAutoFile', param, format);
			conn.execute(query, function(err,result){
				console.log("IndexDAO.deleteAutoFile");
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

	// 파일 정리하기 (파일명 중복)
	app.post("/cleanUpFiles", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(cleanUpFiles)",err);
			} else {
				console.log("Oracle Connection success(cleanUpFiles)");
			}
			conn = con;

			var cleanType = req.body.cleanType;

			let query = "";
			//query format
			let format = {language: 'sql', indent: ''};

			if(cleanType == "findDupNm"){
				var param = {
					sEmplyrSn : req.session.user.emplyrSn
				}

				//getStatement(namespace명, queryId, parameter, format);
				query = mybatisMapper.getStatement('IndexDAO','selectDupList', param, format);
			}

			//쿼리문 실행
			conn.execute(query, function(err,result){
				console.log(query);
				if(err){
					console.log("에러가 발생했습니다(selectDupList)>", err);
					doRelease(conn);
					return;
				}

				res.send(result.rows);
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
