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

    // 인증번호 전송
    app.post("/sendMsg", function(req, res, next){
        res.json(sendMsg(req.body.phoneNo));
    })

    function sendMsg(phoneNo){
        var user_phone_number = phoneNo;
        //var user_auth_number = Math.random().toString(36).slice(2);
        var user_auth_number = Math.random().toString().substring(2,6)
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
}