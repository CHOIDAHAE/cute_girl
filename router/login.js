var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

// mybatis-mapper 추가
var mybatisMapper = require('mybatis-mapper');

// Mapper Load(xml이 있는 디렉토리 주소&파일위치)
mybatisMapper.createMapper( ['./mapper/UserDAO_SQL.xml']);

module.exports = function(app){
    var CryptoJS = require("crypto-js");
    var SHA256 = require("crypto-js/sha256");
    var Base64 = require("crypto-js/enc-base64");
    var request = require("request");
    var fs = require('fs');

	app.get('/join', function(req, res){
        res.render('join', {data:'join'});
    })

    app.get('/login', function(req, res){
        res.render('login', {data:'login'});
    })

    app.get('/findPw', function(req, res){
        res.render('findPw', {data:'findPw'});
    })
    
	app.get('/logout', function(req, res){
		if (req.session.user) {
            req.session.destroy(
                function (err) {
                    if (err) {
                        return;//세션 삭제시 에러
                    }
                    res.redirect('/login');//세션 삭제 성공
                }
            ); 
        } else {
            res.redirect('/login');//로그인 안되어 있음
        }
    })	

    // 비밀번호 찾기 휴대폰 인증화면
    app.get('/findPwByPhone', function(req, res){
        res.render('findPwByPhone', {'emplyrSn':req.query.emplyrSn});
    })

    // 비밀번호 재설정 화면
    app.get('/reSettingPw', function(req, res){
        res.render('reSettingPw', {'emplyrSn':req.query.emplyrSn, 'emplyrId':req.query.emplyrId});
    })

    // 비밀번호 재설정 화면
    app.post("/reSettingPw", function(req, res, next){
        res.render('reSettingPw', {'emplyrSn':req.body.emplyrSn, 'emplyrId':req.body.emplyrId});
    })

    // 2022.11.18 캡챠 테스트(구글)
    app.get('/test_google', function(req, res){
        res.render('test');
    })

    // 인증번호 전송
    app.post("/sendMsg", function(req, res, next){
        res.json(sendMsg(req.body.phoneNo, req.body.type));
    })

    function sendMsg(phoneNo, type){
        var user_phone_number = phoneNo;
        //var user_auth_number = Math.random().toString(36).slice(2);
        var user_auth_number = "";
        
        if(type == 4){  //4자리 인증번호(회원가입)
            user_auth_number = Math.random().toString().substring(2,6);
        } else if (type == 6) { //6자리 인증번호(비밀번호 찾기)
            user_auth_number = Math.random().toString().substring(2,8);
        }
        
        var resultCode = 404;

        const date = Date.now().toString();
        const uri = "ncp:sms:kr:295911194516:mydrive";
        const secretKey = "ilF01AWBVA02VVg6gWL9RFt27hO84P0DnOw4ZyOg";
        const accessKey = "I7DYV8jfHb6f9Z8dSfun";
        const method = "POST";
        const space = " ";
        const newLine = "\n";
        const url = `https://sens.apigw.ntruss.com/sms/v2/services/${uri}/messages`;
        const url2 = `/sms/v2/services/${uri}/messages`;

        const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);

        hmac.update(method);
        hmac.update(space);
        hmac.update(url2);
        hmac.update(newLine);
        hmac.update(date);
        hmac.update(newLine);
        hmac.update(accessKey);

        const hash = hmac.finalize();
        const signature = hash.toString(CryptoJS.enc.Base64);

        request(
            {
                method: method,
                json: true,
                uri: url,
                headers: {
                    "Contenc-type": "application/json; charset=utf-8",
                    "x-ncp-iam-access-key": accessKey,
                    "x-ncp-apigw-timestamp": date,
                    "x-ncp-apigw-signature-v2": signature,
                },
                body: {
                    type: "SMS",
                    countryCode: "82",
                    from: "01067110861",
                    content: `[MYDRIVE] 인증번호는 ${user_auth_number} 입니다.`,
                    messages: [
                    {
                        to: `${user_phone_number}`,
                    },
                    ],
                },
            }, function (err, res, html) {
                if (err) {
                    console.log(err);
                } else {
                    resultCode = 200;
                    //console.log(html);
                }
            }            
        );
        return user_auth_number;
    }

    //***************** Captcha OpenAPI(naver) *****************
    var client_id = 'VGunQCliPygIB0Acwut3';
	var client_secret = 'rLb7gYZvSJ';

    // 캡차 키 발급 요청
	app.get('/captcha/nkey', function (req, res) {
		var code = "0";
		var api_url = 'https://openapi.naver.com/v1/captcha/nkey?code=' + code;
		var request = require('request');
		var options = {
		    url: api_url,
			headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
		};
		request.get(options, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
				res.end(body);
			} else {
				res.status(response.statusCode).end();
				console.log('error = ' + response.statusCode);
			}
		});
	});

    // 캡차 이미지 요청 
    app.get('/captcha/image', function (req, res) {
		var api_url = 'https://openapi.naver.com/v1/captcha/ncaptcha.bin?key=' + req.query.key;
		var request = require('request');
		var options = {
		url: api_url,
			headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
		};

		var writeStream = fs.createWriteStream('./public/images/captcha.jpg');
		var _req = request.get(options).on('response', function(response) {
            //console.log(response.statusCode) // 200
			//console.log(response.headers['content-type'])
		});
		_req.pipe(writeStream); // file로 출력
		_req.pipe(res); // 브라우저로 출력
	});

    // 사용자 입력값 검증 요청
    app.get('/captcha/result', function (req, res) {
		var code = "1";
		var api_url = 'https://openapi.naver.com/v1/captcha/nkey?code=' + code + '&key=' + req.query.key + '&value=' + req.query.value;
		var request = require('request');
		var options = {
			url: api_url,
			headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
		};
		request.get(options, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
				res.end(body);
			} else {
				res.status(response.statusCode).end();
				console.log('error = ' + response.statusCode);
			}
		});
	});
}