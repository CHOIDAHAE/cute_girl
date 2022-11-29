var multer = require('multer');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");

oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');
const { compact } = require('underscore');
const { Callbacks } = require('jquery');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/UserDAO_SQL.xml']);

var storage = multer.diskStorage({
    destination(req, file, cb){
        cb(null, './public/uploadedFiles/');
    },

    //파일 이름 지정 (저장시 파일명이 깨지는 경우가 있는데 다시 불러올 때 DB에 저장해둔 오리지널 파일명 가져오기)
    filename(req, file, cb){
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

var fileFilter = (req, file, cb) => {
	console.log("fileFilter >>>> ");
	console.log(file);
	var fileType = file.originalname.split(".")[1];

	if(fileType == "exe"){
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
    
    app.post('/uploadFile', upload.single('attachment'), function(req, res, next){
		console.log("uploadFiles");
		
		if(req.fileValidationError != null){
			console.log("exe!!");
			res.json("exe");
			return;
		}
		
		//그냥 파일명을 가져올 경우 한글이 깨지는 오류 수정
		var fileNm = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

		var FILE_STRE_COURS_NM = '/uploadedFiles';
		var ORGINL_FILE_NM = fileNm;
		var FILE_NM = req.file.filename;
		var FILE_EXTSN_NM = req.file.originalname.split(".")[1];
		var FILE_MG = req.file.size;
		var emplyrSn = req.session.user.emplyrSn;
		
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
					}

					//파일 등록
					query = mybatisMapper.getStatement('IndexDAO','insertAtchFile', param, format);
					conn.execute(query, function(err,result){
						console.log("IndexDAO.insertAtchFile");
						console.log(query);
						if(err){
							console.log(err);
							res.json("F");
						}
					});

					query = mybatisMapper.getStatement('IndexDAO','insertAtchFileDtl', param, format);
					conn.execute(query, function(err,result){
						console.log("IndexDAO.insertAtchFileDtl");
						console.log(query);

						if(err){
							console.log("fileDtl Insert failed "+err);
							res.json("F");
						}
					});
				}

				doRelease(conn);
			});
		});

		console.log(req.session.user.emplyrSn);
		res.render('index', {"emplyrSn":req.session.user.emplyrSn});
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
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectFileList', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
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
				, fileSn : req.body.fileSn
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

	function doRelease(conn){
		conn.close(function(err){
			if(err){
				console.log("doRelease error!");
				console.error(err.message);
			}
		})
	}
}
