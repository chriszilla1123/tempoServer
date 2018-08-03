var fs = require('fs');

module.exports = function(tempoServer, db, baseDir) {
    tempoServer.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,           Accept");
      next();
});  
  
    // Notes endpoints 
    tempoServer.get('/notes/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('notes').findOne(details, (err, item) => {
            if (err) {
                res.send({ 'error': 'An error has occured'});
            }
            else{
                res.send(item);
            }
        });
    });
    
    tempoServer.delete('/notes/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        
        db.collection('notes').remove(details, (err, item) => {
            if (err) {
                res.send({ 'error': 'An error has occured'});
            }
            else{
                res.send("Note " + id + " deleted.");
            }
        });
    });
    
    tempoServer.put('/notes/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        const note = {text: req.body.body, title: req.body.title};
        
        db.collection('notes').update(details, note, (err, item) => {
            if (err) {
                res.send({ 'error': 'An error has occured'});
            }
            else{
                res.send(item);
            }
        });
    });
    
    tempoServer.post('/notes', (req, res) => {
        console.log("Hit on /notes endpoint");
        const note = {text: req.body.body, title: req.body.title}
        
        db.collection('notes').insert(note, (err, result) => {
            if (err) {
                res.send({ 'error': 'An error has occured'});
            }
            else{
                res.send(result.ops[0]);
            }
        });
    });
    
    //Song endpoints
    
    tempoServer.get('/getLibrary', (req, res) => {
        dbQuery = "SELECT * FROM library";
        db.query(dbQuery, function(err, result) {
            if(err){
               res.send(err);
            } 
            else{
                res.send(result);
            }
        });
    });
  
    tempoServer.get('/getArtists', (req, res) => {
        dbQuery = "SELECT DISTINCT artist FROM library"
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
        dbQuery = "SELECT * FROM library WHERE id = " + db.escape(id);
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
        dbQuery = "SELECT * FROM library";
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
        dbQuery = "SELECT * FROM library WHERE artist = " + db.escape(artist);
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
        dbQuery = "SELECT * FROM library WHERE artist = " + db.escape(artist);
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
