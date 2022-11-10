var crypto = require('crypto');

var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/IndexDAO_SQL.xml']);

module.exports = function(app){
	var bodyParser = require('body-parser');
	app.use(bodyParser.urlencoded({extended:true}));
	app.use(bodyParser.json());

	var conn;

	app.get('/', function(req, res, next){
		res.render('login',{data:'login'});
	})

	app.get('/index', function(req, res, next){		
		res.render('index',{data:'index'});
		
		/*oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(dbConn.js)",err);
			} else {
				res.render('index',{data:'index'});
				console.log("Oracle Connection success(dbConn.js)");
			}
			conn = con;
		});*/
	})

	// 전체 파일 용량 읽어오기
	app.post("/selectFileVolume", function(req, res){		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(selectFileVolume)",err);
			} else {
				console.log("Oracle Connection success(selectFileVolume)");
			}
			conn = con;

			var param = {
				emplyrSn : req.body.emplyrSn
			}

			//query format
			let format = {language: 'sql', indent: ''};

			//getStatement(namespace명, queryId, parameter, format);
			let query = mybatisMapper.getStatement('IndexDAO','selectFileVolume', param, format);

			//쿼리문 실행
			conn.execute(query, function(err,result){
				if(err){
					console.log("에러가 발생했습니다(selectFileVolume)>", err);
					doRelease(conn);
					return;
				}
				console.log("selectFileVolume success!");
				
				res.send(result.rows);
				doRelease(conn);					
			});  
		});
	})

	//로그인
	app.post("/frmNIDLogin", function(req, res, next){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/frmNIDLogin)",err);
			} else {
				console.log("Oracle Connection success(/frmNIDLogin)");
			}
			conn = con;
		
			var param = {
				id : req.body.id,
				pw : req.body.pw
			}

			//query format
			let format = {language: 'sql', indent: ''};
	
			//comparePw
			let comparePwQuery = mybatisMapper.getStatement('UserDAO','comparePw', param, format);
			
			conn.execute(comparePwQuery, function(err,result){
				if(err){
					console.log("comparePwQuery failed");
					res.json("F");
				} else {
					console.log("comparePwQuery success!");
					
					if(result.rows == ""|| result.rows == null){
						console.log("LOGIN failed");
						res.json("I");
						return;
					}
					
					var dbPw = result.rows[0][1];
					var inputPw = req.body.pw;
					var dbId = result.rows[0][0];
					var salt = result.rows[0][2];
					let hashPassword = crypto.createHash("sha256").update(inputPw + salt).digest("hex");
					
					if (dbPw === hashPassword){
						console.log("LOGIN success!");
						res.json("S");
					} else {
						console.log("LOGIN failed");
						res.json("N");
					}
				}
			});
		});
	})

	// 회원가입시 아이디 중복체크
	app.post("/chkDuplId", function(req, res, next){	
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/chkDuplId)",err);
			} else {
				console.log("Oracle Connection success(/chkDuplId)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			//아이디 중복 체크
			let query = mybatisMapper.getStatement('UserDAO','selectUserId', {id : req.body.id}, format);

			conn.execute(query, function(err,result){
				console.log(result.rows[0][0]);
				if(err){
					console.log("chkDuplId failed");
					res.json("F");
				} else {
					if(result.rows[0][0] == 0){	// 중복아이디가 없음
						res.json("S");	//사용가능한 아이디
					} else {	// 중복아이디 존재
						res.json("N");	//사용중인 아이디
					}
				}
				doRelease(conn);
			});
		});
	})
	
	// 회원가입
	app.post("/frmNIDJoin", function(req, res, next){		
		var id = req.body.id;
		var pw = req.body.pw;
		var name = req.body.name;
		var gender = req.body.gender;
		var email = req.body.email;
		var phoneNo = req.body.phoneNo;
		
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("Oracle Connection failed(/Join)",err);
			} else {
				console.log("Oracle Connection success(/Join)");
			}
			conn = con;
				
			//query format
			let format = {language: 'sql', indent: ''};
			
			//emplyrSn MAX값 찾기
			let query = mybatisMapper.getStatement('UserDAO','selectemplyrSn', {}, format);

			conn.execute(query, function(err,result){
				if(err){
					console.log(err);
				} else {
					var salt = Math.round((new Date().valueOf() * Math.random()))+"";
					var hashPassword = crypto.createHash("sha256").update(pw + salt).digest("hex");

					var emplyrSn = result.rows[0][0];

					var param = {
						id : id,
						pw : hashPassword,
						salt : salt,
						name : name,
						gender : gender,
						email : email,
						phoneNo : phoneNo,
						emplyrSn: emplyrSn
					}

					//insert
					let InstQuery = mybatisMapper.getStatement('UserDAO','joinUser', param, format);

					//쿼리문 실행(insert)
					conn.execute(InstQuery, function(err,result){
						if(err){
							console.log("JOIN failed"+err);
							res.json("F");
						}
						res.json("S");
					});				
				}
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
