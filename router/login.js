// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/IndexDAO_SQL.xml']);

module.exports = function(app){
    app.get('/join', function(req, res){
        res.render('join', {data:'join'});
    })

    app.get('/login', function(req, res){
        res.render('login', {data:'login'});
    })

    // 로그인
	app.post("/frmNIDLogin", function(request, response){
        var param = {
			id : request.body.id,
            pw : request.body.pw
		}

		//query format
		let format = {language: 'sql', indent: ''};

		//getStatement(namespace명, queryId, parameter, format);
		let query = mybatisMapper.getStatement('userDAO','selectUser', param, format);

		//쿼리문 실행
		conn.execute(query, function(err,result){
					if(err){
						console.log("에러가 발생했습니다-->", err);
						//doRelease(conn);
						return;
					}
					console.log("LOGIN success!");

					//doRelease(conn, result.rows);
					response.send(result.rows);
					//response.json({'name':'박문석', 'age':50});
					//response.render('index', {test: 'test'});
			});
	})
}