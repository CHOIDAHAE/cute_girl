// database
var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");

oracledb.autoCommit = true; //자동 커밋

oracledb.getConnection({
	user:dbConfig.user,
	password:dbConfig.password,
	connectString:dbConfig.connectString
	}, function(err,conn) {
        if(err){
            console.log("접속이 실패했습니다.",err);
        }
        console.log("***접속성공***");        
        conn = con;
});

module.exports = function(app){
    app.post("/selectTest", function(request, response){
        //console.log(request.body);
        //오라클에 접속해서 쿼리 실행
        conn.execute("SELECT EMPLYR_NM, PASSWORD_ERROR_CO FROM TCM_EMPLYR WHERE EMPLYR_SN = '19940305'",
			function(err,result){
				if(err){
					console.log("에러가 발생했습니다.", err);
					//response.writeHead(500, {"ContentType":"text/html"});
					//response.end("fail!!");
                    doRelease(conn);
		            return;
				}
                
                console.log("result>> "+result);
                console.log("성공");
                doRelease(connection, result.rows);
        });
        
        function doRelease(conn, userlist){
            console.log("doRelease");
            conn.close(function(err){
                if(err){
                    console.error(err.message);
                }
            })
            
            response.send(userlist);
        }
    })
};