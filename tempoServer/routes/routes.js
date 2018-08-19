var fs = require('fs');
var cors = require('cors');
var bodyParser = require('body-parser');

module.exports = function(tempoServer, db, baseDir) {
    /*tempoServer.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,           Accept");
      next();
    });*/
    tempoServer.use(cors());
    tempoServer.use(bodyParser.json());
    
    //Global Values
    function setTypeHeader(fileType){
        header_mp3 = "audio/mpeg";
        header_m4a = "audio/mpeg";
        header_flac = "audio/flac";

        if(fileType === ".mp3") return header_mp3;
        if(fileType === ".m4a") return header_m4a;
        if(fileType === ".flac") return header_flac;
    }

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
    
    tempoServer.get('/getAlbumsByArtist/:id', (req, res) => {
        const id = req.params.id;
        dbQuery = "SELECT * FROM albums WHERE artist = " + db.escape(id);
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                res.send(result);
            }
        });
    });

    tempoServer.get('/getArtistByAlbum/:id', (req, res) => {
        const id = req.params.id;
        dbQuery = "SELECT * FROM albums WHERE id = " + db.escape(id);
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                if(result.length == 0){
                    console.log("Error: No results found for: '" + id + "'")
                    return;
                }
                res.send(result[0].artist.toString());
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
                if(result.length == 0){
                    console.log("Error: No results found for '" + id + "'");
                    return;
                }
                if(result[0].hasOwnProperty('directory')){
                    song = baseDir + result[0].directory;
                    fileType = result[0].fileType;
                    res.header("Content-Type", setTypeHeader(fileType));
                    songStream = fs.createReadStream(song);
                    songStream.pipe(res);
                }
                else{
                    console.log("Error: 'directory' not found for " + id);
                }
            }
        });
    });
    
    tempoServer.get('/getRandomSong', (req, res) => {
        dbQuery = 'SELECT * FROM songs';
        dbArtistQuery = 'SELECT artist FROM artists WHERE id='
        db.query(dbQuery, function(err, result) {
            if(err){
                res.send(err);
            }
            else{
                length = result.length;
                songIndex = Math.floor(Math.random() * Math.floor(length));
                dbArtistQuery += result[songIndex].artist;
                db.query(dbArtistQuery, function(err, aResult) {
                    if(err){
                        res.send(err);
                    }
                    else{
                        console.log("Choosing song: \"" + result[songIndex].title
                            + "\" by " + aResult[0].artist);
                        song = baseDir + result[songIndex].directory;
                        fileType = result[songIndex].fileType;
                        res.header("Content-Type", setTypeHeader(fileType));
                        songStream = fs.createReadStream(song);
                        songStream.pipe(res);
                    }
                });
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

    tempoServer.post('/search', (req, res) => {
        json = req.body;

        artistResults = [];
        albumResults = [];
        songResults = [];
        searchResults = [];
        if(json.hasOwnProperty('all')){
            dbQuery = "SELECT * FROM artists WHERE artist LIKE"
                + db.escape("%" + json.all + "%");;
            db.query(dbQuery, function(err, result){
                if(err) res.send(err)
                else{
                    artistResults.push(result);
                    dbQuery = "SELECT * FROM albums WHERE album LIKE"
                        + db.escape("%" + json.all + "%");;
                    db.query(dbQuery, function(err, result){
                        if(err) res.send(err)
                        else{
                            albumResults.push(result);
                            dbQuery = "SELECT * FROM songs WHERE title LIKE"
                                + db.escape("%" + json.all + "%");;
                            db.query(dbQuery, function(err, result){
                                if(err) res.send(err)
                                else{
                                    songResults.push(result);
                                    searchResults.push(artistResults);
                                    searchResults.push(albumResults);
                                    searchResults.push(songResults);
                                    res.send(searchResults);
                                }
                            });
                        }
                    });
                }
            });
        }
        else{
            console.log('err');
            res.send(req.body);
        }
    });
}
