var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

module.exports = function(app){
	var conn;

	app.get('/', function(req, res, next){
		oracledb.getConnection({
			user:dbConfig.user,
			password:dbConfig.password,
			connectString:dbConfig.connectString,
			externalAuth  : dbConfig.externalAuth
		},function(err,con){
			if(err){
				console.log("접속 실패******(dbConn.js)",err);
			} else {
				res.render('index.html');
				console.log("접속 성공 !!!!!!(dbConn.js)");
			}
			conn = con;
		});
	})

	// 전체 파일 용량 읽어오기
	app.post("/selectFileVolume", function(request, response){
		console.log("selectFileVolume 요청(dbConn.js)");
		console.log(request);
		//쿼리문 실행
		var sql = "SELECT CEIL(SUM(FILE_MG)/1000) FILE_MG FROM TCM_ATCHMNFL_DETAIL WHERE LAST_UPDUSR_SN = '1111111111118'";
		conn.execute(sql, function(err,result){
					if(err){
						console.log("에러가 발생했습니다-->", err);
						//doRelease(conn);
						return;
					}
					console.log("selectFileVolume 성공!");
					console.log(result.rows);

					//doRelease(conn, result.rows);
					response.send(result.rows);
					//response.render('index.html', {test: 'test'});
			});  
	})

	app.post("/selectTest",function(request, response){
		console.log("클라이언트로부터 selectTest 요청(dbConn.js)");
		//쿼리문 실행
		var sql = "SELECT EMPLYR_NM, PASSWORD_ERROR_CO FROM TCM_EMPLYR WHERE EMPLYR_SN = '1111111111118'";
		conn.execute(sql, function(err,result){
				if(err){
					console.log("에러가 발생했습니다-->", err);
					//doRelease(conn);
					return;
				}
				console.log("성공!");
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
