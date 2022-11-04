var fs = require('fs');

module.exports = function(app){
    /* dbConn.js로 이동
    app.get('/', function(req, res){
        res.render('index.html');
    })*/

    app.get('/join', function(req, res){
        res.render('join', {data:'join'});
    })

    app.get('/login', function(req, res){
        res.render('login', {data:'login'});
    })

    app.get('/photo', function(req, res){
        res.render('photo', {data:'photo'});
    })

    app.get('/movie', function(req, res){
        res.render('movie', {data:'movie'});
    })

    app.get('/document', function(req, res){
        res.render('document', {data:'document'});
    })

    app.get('/music', function(req, res){
        res.render('music', {data:'music'});
    })

    app.get('/trash', function(req, res){
        res.render('trash', {data:'trash'});
    })
    
    app.get('/about', function(req, res){
        res.render('about', {data:'about'});
    })

    var array = [];
    for(var i =0; i < 5; i++){
    array[i] = {
        id : i,
        value : i*i
    };
}



// var output = _.filter(array, function(item){
//     return item.value < 50;
// });
// console.log('filter', output);

// var output = _.reject(array, function(item){
//     return item.value < 50;
// });
// console.log('reject', output);

// var output = _.map(array, function(item){
//     return item.id + ':' + item.value;
// });
// console.log('map', output);

// var output = _.find(array, function(item){
//     return item.id == 5;
// });
// console.log('find', output);

// var output = _.sordBy(array, function(item){
//     return item.id;
// });
// console.log('sordBy', output);

    var files = [
        { Num : 1, fileSn : 1, fileNm : 'file1' }
        , { Num : 2, fileSn : 2, fileNm : 'file2'}
        , { Num : 3, fileSn : 3, fileNm : 'file3'}
        , { Num : 4, fileSn : 4, fileNm : 'file4'}
        , { Num : 5, fileSn : 5, fileNm : 'file5'}
    ]

    app.post('/files/get', function(request, response){
        var output = null;

        var sidx = request.param('sidx');
        if(sidx == ''){
            sidx = 'id';
        }

        output = _.sortBy(files, function(item){
            return item[sidx];
        });

        var sord = request.param('sord');
        if(sord == 'desc'){
            output = output.reverse();
        }

        var page = Number(request.param('page'));
        var rows = Number(request.param('rows'));
        var totalRecords = files.length;
        var totalPages = Math.ceil(totalRecords/rows);
        var start = rows * page - rows;

        output = output.slice(start, start+rows);

        var param = {
            page : page,
            total : totalPages,
            records : totalRecords,
            rows : _.map(output, function(item){
                return{
                    id : item.id
                    , ceil : _.toArray(item)
                }
            })
        }
        response.send(param);
    })
}