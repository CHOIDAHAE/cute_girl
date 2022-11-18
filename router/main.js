
module.exports = function(app){
    /* dbConn.js로 이동
    app.get('/', function(req, res){
        res.render('index.html');
    })*/

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

    app.get('/main', function(req, res){
        res.render('main', {data:'main'});
    })

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
}