var fs = require('fs');

module.exports = function(tempoServer, db, baseDir) {
    tempoServer.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,           Accept");
      next();
});  
    //Song endpoints
    tempoServer.get('/getArtists', (req, res) => {
        dbQuery = "SELECT *  FROM artists"
        db.query(dbQuery, function(err, result) {
            if(err){
               res.send(err);
            } 
            else{
                res.send(result);
            }
        });
    });
    
    tempoServer.get('/getAlbums', (req, res) => {
        dbQuery = "SELECT *  FROM albums"
        db.query(dbQuery, function(err, result) {
            if(err){
               res.send(err);
            } 
            else{
                res.send(result);
            }
        });
    });
    
    tempoServer.get('/getSongs', (req, res) => {
        dbQuery = "SELECT * FROM songs";
        db.query(dbQuery, function(err, result) {
            if(err){
               res.send(err);
            } 
            else{
                res.send(result);
            }
        });
    });
    
    tempoServer.get('/getSongByID/:id', (req, res) => {
        const id = req.params.id;
        dbQuery = "SELECT * FROM songs WHERE id = " + db.escape(id);
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                song = baseDir + result[0].directory;
                songStream = fs.createReadStream(song);
                songStream.pipe(res);
            }
        });
    });
    
    tempoServer.get('/getRandomSong', (req, res) => {
        dbQuery = "SELECT * FROM songs";
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                length = result.length;
                songIndex = Math.floor(Math.random() * Math.floor(length));
                console.log("Choosing song: \"" + result[songIndex].title
                    + "\" by " + result[songIndex].artist);
                song = baseDir + result[songIndex].directory;
                songStream = fs.createReadStream(song);
                songStream.pipe(res);
            }
        });
    });
    
    tempoServer.get('/getSongsByArtist/:artist', (req, res) => {
        const artist = req.params.artist;
        dbQuery = "SELECT * FROM songs WHERE artist = " + db.escape(artist);
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                res.send(result);
            }
        });
    });
    
    tempoServer.get('/getRandomSongByArtist/:artist', (req, res) => {
        const artist = req.params.artist;
        dbQuery = "SELECT * FROM songs WHERE artist = " + db.escape(artist);
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                length = result.length;
                songIndex = Math.floor(Math.random() * Math.floor(length));
                song = baseDir + result[songIndex].directory;
                songStream = fs.createReadStream(song);
                songStream.pipe(res);
            }
        });
    });
}
