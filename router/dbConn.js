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
				res.render('index.html');
				console.log("Oracle Connection success(dbConn.js)");
			}
			conn = con;
		});
	})

	// 전체 파일 용량 읽어오기
	app.post("/selectFileVolume", function(request, response){
		var param = {
			emplyrSn : request.body.emplyrSn
		}

		//query format
		let format = {language: 'sql', indent: ''};

		//getStatement(namespace명, queryId, parameter, format);
		let query = mybatisMapper.getStatement('IndexDAO','selectFileVolume', param, format);

		//쿼리문 실행
		conn.execute(query, function(err,result){
					if(err){
						console.log("에러가 발생했습니다-->", err);
						//doRelease(conn);
						return;
					}
					console.log("selectFileVolume success!");
					console.log(result.rows);

					//doRelease(conn, result.rows);
					response.send(result.rows);
					//response.json({'name':'박문석', 'age':50});
					//response.render('index', {test: 'test'});
			});  
	})

	app.post("/selectTest",function(request, response){
		console.log("selectTest request(dbConn.js)");
		//쿼리문 실행
		var sql = "SELECT EMPLYR_NM, PASSWORD_ERROR_CO FROM TCM_EMPLYR WHERE EMPLYR_SN = '1111111111118'";
		conn.execute(sql, function(err,result){
				if(err){
					console.log("에러가 발생했습니다-->", err);
					//doRelease(conn);
					return;
				}
				console.log("selectTest success!");
				console.log(result.rows);

				//doRelease(conn, result.rows);
				response.send(result.rows);
		});
	})

	function doRelease(conn, userlist){
		console.log("doRelease");
		conn.close(function(err){
			if(err){
				console.error(err.message);
			}
		})    
		response.send(userlist);
	}
}
