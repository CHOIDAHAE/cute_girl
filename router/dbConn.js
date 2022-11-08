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
							doRelease(conn);
					} else {
						console.log("LOGIN success!");
						res.send(
						`<script type="text/javascript">
							document.location.href="/";
						</script>`);
						doRelease(conn);
					}
				});
			});
		} else {
			console.log("LOGIN success!");
			res.send("성공");
			//res.render('login',{data:'login'});
		}
	})

	// 회원가입
	app.post("/frmNIDJoin", function(req, res, next){
		console.log("회원가입 시작");
		
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
					console.log("selectin emplyrSn got failed");
				} else {
					var emplyrSn = result.rows[0][0];
					console.log(result.rows[0][0]);
					var param = {
						id : id,
						pw : pw,
						name : name,
						gender : gender,
						email : email,
						phoneNo : phoneNo,
						emplyrSn: emplyrSn
					}

					//insert
					let InstQuery = mybatisMapper.getStatement('UserDAO','joinUser', param, format);
					
					console.log(InstQuery);

					//쿼리문 실행(insert)
					conn.execute(InstQuery, function(err,result){
						if(err){
							console.log("JOIN failed"+err);
			
							/*res.send(
							`<script type="text/javascript">
								alert("회원가입 중 오류가 발생했습니다."); 
								document.location.href="/join";
							</script>`);*/
						} else {
							console.log("JOIN success!");
							res.send("S");
							//res.render('login',{data:'login'});
						}						
						doRelease(conn);
					});
				}
			});
		});
	})

	function doRelease(conn){
		console.log("******doRelease******");
		conn.close(function(err){
			if(err){
				console.log("doRelease error!");
				console.error(err.message);
			}
		})
	}
}
