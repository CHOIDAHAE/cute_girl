
module.exports = function(app){
    /* dbConn.js로 이동
    app.get('/', function(req, res){
        res.render('index.html');
    })*/

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