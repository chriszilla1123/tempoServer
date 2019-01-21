const fs = require('fs');

var baseDir = "/home/chris/Storage/Music/";
var audioFileTypes = [".mp3", ".m4a", ".flac"];
var artFileTypes = [".jpg", ".jpeg", ".png"]
var artistExceptions = ["tempo_minified"]
var albumExceptions = []
var songExceptions = []

//Regenerates the database, deletes the old table first.
exports.initDatabase = function initDatabase(db, callback) {
    databaseName = "musicserver";
    artistQuery = "CREATE TABLE artists (id int AUTO_INCREMENT, "
        + "PRIMARY KEY (ID), artist VARCHAR(255), numSongs int, "
        + "numAlbums int, picture VARCHAR(255))";
    albumQuery = "CREATE TABLE albums (id int AUTO_INCREMENT, "
        + "PRIMARY KEY (ID), artist int, album VARCHAR(255), numSongs int, "
        + "albumArt VARCHAR(255))";
    songQuery = "CREATE TABLE songs (artist int, album int, "
        + "title VARCHAR(255), fileType VARCHAR(255), directory VARCHAR(255), "
        + "id int AUTO_INCREMENT, PRIMARY KEY (ID))";
    db.query(artistQuery, function(err, result) {
        if(err){
            dropTableQuery = "DROP TABLE artists";
            db.query(dropTableQuery, function(err, result){
                if(err) console.log(err);
                //else console.log("Table deleted");
                db.query(artistQuery, function(err, result){
                    if(err) throw err;
                    else {
                        //console.log("Artist table created successfully");
                        createAlbumTable()
                    }
                });
            });
        }
        else {
            //console.log("Artist table created successfully");
            createAlbumTable();
        }
    });
    function createAlbumTable(){
        db.query(albumQuery, function(err, result) {
            if(err){
                dropTableQuery = "DROP TABLE albums";
                db.query(dropTableQuery, function(err, result){
                    if(err) console.log(err);
                    //else console.log("Table deleted");
                    db.query(albumQuery, function(err, result){
                        if(err) throw err;
                        else {
                            //console.log("Album table created successfully");
                            createSongTable()
                        }
                    });
                });
            }
            else {
                //console.log("Album table created successfully");
                createSongTable();
            }
        });
    }
    function createSongTable(){
        db.query(songQuery, function(err, result) {
            if(err){
                dropTableQuery = "DROP TABLE songs";
                db.query(dropTableQuery, function(err, result){
                    if(err) console.log(err);
                    //else console.log("Table deleted");
                    db.query(songQuery, function(err, result){
                        if(err) throw err;
                        else {
                            //console.log("Song table created successfully");
                            fillTables()
                        }
                    });
                });
            }
            else {
                console.log("Song table created successfully");
                fillTables();
            }
        });
    }

    //Finds all songs that meet the filetype restrictions, and inserts
    //them into the database with one "INSERT INTO" op.
    function fillTables(){
        artists = [];
        albums = []
        artistRecords = [];
        albumRecords = [];
        songRecords = [];
        artistQuery = "INSERT INTO artists (artist, numSongs, numAlbums, picture) VALUES ?";
        albumQuery = "INSERT INTO albums (artist, album, numSongs, albumArt) VALUES ?";
        songQuery = "INSERT INTO songs (artist, album, title, fileType, directory) VALUES ?";
        
        fs.readdirSync(baseDir).forEach(artist => {
            if(artistExceptions.includes(artist)) return;
            
            if(fs.statSync(baseDir + artist).isDirectory){
                artistDir = baseDir + artist + '/';
                artists.push(artist);
                if(artistIsRecorded(artist) === false){
                    artistRecords.push([artist, 0, 0, ""]);
                }
                fs.readdirSync(artistDir).forEach(album => {
                    if(fs.statSync(artistDir + album).isDirectory()){
                        albumDir = artistDir + album + '/';
                        artistNumber = artists.indexOf(artist) + 1;
                        if(albumIsRecorded(artist, album) === false){
                            var tup = Object.freeze([artist, album]);
                            albums.push(tup);
                            albumArt = findArtwork(albumDir)
                            albumRecords.push([artistNumber, album, 0, albumArt]);
                            artistRecords[artistNumber - 1][2] += 1;
                        }
                        fs.readdirSync(albumDir).forEach(title => {
                            if(fs.statSync(albumDir + title).isDirectory() == false){
                                relDir = artist + '/' + album + '/' + title;
                                albumNumber = (albums.indexOf(tup) + 1);
                                audioFileTypes.forEach(type => {
                                    if(title.indexOf(type) !== -1){
                                        title = title.split(type)[0];
                                        title = prettyTitle(title);
                                        songRecords.push([artistNumber, albumNumber, title, type, relDir]);
                                        artistRecords[artistNumber - 1][1] += 1;
                                        albumRecords[albumNumber - 1][2] += 1; //TODO
                                    }
                                });
                            }
                        });
                    }
                    else{
                        //console.log("Not a directory! (2)");
                    }
                });
            }
            else{
                //console.log("Not a directory! (1)");
            }
        });
        db.query(artistQuery, [artistRecords], function(err, result){
            if(err) throw err;
            console.log("Inserted " + result.affectedRows + " artists into library");
        });
        db.query(albumQuery, [albumRecords], function(err, result){
            if(err) throw err;
            console.log("Inserted " + result.affectedRows + " albums into library");
        });
        db.query(songQuery, [songRecords], function(err, result){
            if(err) throw err;
            console.log("Inserted " + result.affectedRows + " songs into library");
        });
        function artistIsRecorded(artist){
            for(var i=0; i < artistRecords.length; i++){
                if(artistRecords[i][0] == artist) return true;
            };
            return false;
        };
        function albumIsRecorded(artist, album){
            for(var i=0; i < albumRecords.length; i++){
                if(albumRecords[i][1] == album && albumRecords[i][0] == artist) return true;
            };
            return false;
        };
        //Write timestamp and call callback
        var timestampLoc = "lastDatabaseUpdate";
        var curTime = Date.now().toString();
        fs.writeFile(timestampLoc, curTime, function(err) {
            if(err) console.log(err)
        });
        if(callback) callback();
    }
}

function prettyTitle(title) { //TODO: Fix this
    regexs = [
      /\d\s\-\s/,
      /\d\s\-/,
      /\d\s/,
      /\d\./,
      /\-\s/
      ]
  
    regexs.forEach(regex => {
      if(title.indexOf(regex)) {
      //console.log(title);
      title = title.split(regex);
      title = title[title.length - 1];
      //console.log(title);
      //console.log("----------");
    }
    });
    return title;
  }

  function findArtwork(dir) {
      /*Accepts a filesystem absolute location, and returns the location of the
        first supported image file, relative to the base dir. If none is found,
        returns an empty string.
        */
        result = ''
        var files = fs.readdirSync(dir)
        scan:
        for(var i = 0; i < files.length; i++){
            var file = files[i]
            for(var j=0; j <= artFileTypes.length; j++){
                var type = artFileTypes[j]
                if(file.indexOf(type) != -1) { //Artwork file found
                    result = dir + file;

                    //Strip the base dir, and leave only the relative dir
                    result = result.replace(baseDir, '')
                    break scan;
                }
            }
        }
        console.log(result)
        return result;
  }