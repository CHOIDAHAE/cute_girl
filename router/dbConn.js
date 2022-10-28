module.exports = function(app){
    // database
    var oracledb = require("oracledb");
    var dbConfig = require("./dbConfig.js");

    oracledb.autoCommit = true;

    var conn;

    app.post("/selectFileVolume", function(request, response){
        console.log("selectFileVolume 요청(dbConn.js)");

        oracledb.getConnection({
            user:"mydrive",
            password:"1234",
            connectString:"localhost/mydrive",
            externalAuth  : false
        },function(err,con){
            if(err){
                console.log("(new)접속 실패******",err);
            } else {
                console.log("(new)접속 성공 !!!!!!");
            }
            conn = con;
        });

        //쿼리문 실행
        var sql = "SELECT SUM(FILE_MG) FILE_MG FROM TCM_ATCHMNFL_DETAIL WHERE LAST_UPDUSR_SN = '1111111111118'";
        conn.execute(sql, function(err,result){
                    if(err){
                        console.log("에러가 발생했습니다.", err);
                        doRelease(conn);
                        return;
                    }
                    console.log("성공!");
                    console.log(result.rows);

                    doRelease(conn, result.rows);
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
}
/*//오라클 접속
var oracledb = require("oracledb");
var dbConfig = require("./DB/dbConfig.js");

oracledb.autoCommit = true;

var conn;

oracledb.getConnection({
    user:dbConfig.user,
    password:dbConfig.password,
    connectString:dbConfig.connectString,
    externalAuth  : false
},function(err,con){
    if(err){
        console.log("접속 실패******",err);
    } else {
        console.log("접속 성공 !!!!!!");
    }
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
                    //doRelease(conn);
		            return;
				}
                
                console.log("result>> "+result);
                console.log("성공");
                //doRelease(connection, result.rows);
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
};*/
