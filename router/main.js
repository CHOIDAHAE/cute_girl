module.exports = function(app){
    app.get('/', function(req, res){
        res.render('index.html');
    })

    app.get('/photo', function(req, res){
        res.render('photo.html');
    })

    app.get('/movie', function(req, res){
        res.render('movie.html');
    })

    app.get('/document', function(req, res){
        res.render('document.html');
    })

    app.get('/music', function(req, res){
        res.render('music.html');
    })

    app.get('/trash', function(req, res){
        res.render('trash.html');
    })
    
    app.get('/about', function(req, res){
        res.render('about.html');
    })
}