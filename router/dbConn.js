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
		oracledb.getConnection({
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
		});
	})

	// 전체 파일 용량 읽어오기
	app.post("/selectFileVolume", function(req, res){		
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
						console.log("에러가 발생했습니다-->", err);
						doRelease(conn);
						return;
					}
					console.log("selectFileVolume success!");

					doRelease(conn, result.rows);
					res.send(result.rows);
			});  
	})

	// 로그인
	app.post("/frmNIDLogin", function(req, res, next){
		if (req.body.id && req.body.pw) {

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
		
				//getStatement(namespace명, queryId, parameter, format);
				let query = mybatisMapper.getStatement('UserDAO','selectUser', param, format);

				//쿼리문 실행
				conn.execute(query, function(err,result){
					if(err){
						console.log("LOGIN failed");

						res.send(
							`<script type="text/javascript">
								alert("로그인 정보가 일치하지 않습니다."); 
								document.location.href="/login";
							</script>`);
						doRelease(conn, result.rows);
					} else {
						console.log("LOGIN success!");
						res.send(
						`<script type="text/javascript">
							document.location.href="/";
						</script>`);
						doRelease(conn, result.rows);
					}
				});
			});
		} else {
			res.send(
				`<script type="text/javascript">
					alert("아이디와 비밀번호를 입력하세요!");
					document.location.href="/login";
				</script>`);
		}
	})

	// 회원가입
	app.post("/frmNIDJoin", function(req, res, next){
		if (req.body.id && req.body.pw) {
			
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
			
				var param = {
					id : req.body.id,
					pw : req.body.pw
				}

				//query format
				let format = {language: 'sql', indent: ''};
		
				//getStatement(namespace명, queryId, parameter, format);
				let query = mybatisMapper.getStatement('UserDAO','selectUser', param, format);

				//쿼리문 실행
				conn.execute(query, function(err,result){
					if(err){
						console.log("LOGIN failed");

						res.send(
							`<script type="text/javascript">
								alert("로그인 정보가 일치하지 않습니다."); 
								document.location.href="/login";
							</script>`);
						doRelease(conn, result.rows);
					} else {
						console.log("LOGIN success!");
						res.send(
						`<script type="text/javascript">
							document.location.href="/";
						</script>`);
						doRelease(conn, result.rows);
					}
				});
			});
		} else {
			res.send(
				`<script type="text/javascript">
					alert("아이디와 비밀번호를 입력하세요!");
					document.location.href="/login";
				</script>`);
		}
	})

	app.post("/selectTest",function(req, res){
		console.log("selectTest req(/selectTest)");
		//쿼리문 실행
		var sql = "SELECT EMPLYR_NM, PASSWORD_ERROR_CO FROM TCM_EMPLYR WHERE EMPLYR_SN = '1111111111118'";
		conn.execute(sql, function(err,result){
				if(err){
					console.log("에러가 발생했습니다-->", err);
					//doRelease(conn);
					return;
				}
				console.log("selectTest success!");

				//doRelease(conn, result.rows);
				res.send(result.rows);
		});
	})

	function doRelease(conn, userlist){
		console.log("doRelease");
		conn.close(function(err){
			if(err){
				console.error(err.message);
			}
		})
	}
}
