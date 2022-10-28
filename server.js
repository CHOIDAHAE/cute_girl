var bodyParser = require('body-parser')

var _ = require('underscore');


// app.get('/', function(req, res){
//     res.send('Hello World');
// })

var express = require('express');
var app=express();
var router = require('./router/main')(app);

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.engine('html', require('ejs').renderFile);

var server = app.listen(3000, function(){
    console.log("Express server has started on port 3000")
});

//***************** 오라클 접속  *****************/
var oracledb = require("oracledb");
oracledb.autoCommit = true;

var conn;

oracledb.getConnection({
    user:"mydrive",
    password:"1234",
    connectString:"localhost/mydrive",
    externalAuth  : false
},function(err,con){
    if(err){
        console.log("접속 실패******(server.js)",err);
    } else {
        console.log("접속 성공 !!!!!!(server.js)");
    }
    conn = con;
});

// 전체 파일 용량 읽어오기
app.post("/selectFileVolume", function(request, response){
    console.log("selectFileVolume 요청(server.js/new)");
    //쿼리문 실행
    var sql = "SELECT SUM(FILE_MG) FILE_MG FROM TCM_ATCHMNFL_DETAIL WHERE LAST_UPDUSR_SN = '1111111111118'";
    conn.execute(sql, function(err,result){
                if(err){
                    console.log("에러가 발생했습니다.", err);
                    //doRelease(conn);
                    return;
                }
                console.log("selectFileVolume 성공!");
                console.log(result.rows);

                //doRelease(conn, result.rows);
                response.send(result.rows);
        });  
})

app.post("/selectTest",function(request, response){
    console.log("클라이언트로부터 selectTest 요청(server.js)");
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