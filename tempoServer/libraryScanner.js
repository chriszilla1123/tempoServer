const fs = require('fs');
const path = require('path')

var baseDir = "/home/chris/Storage/Music/";
var audioFileTypes = [".mp3", ".m4a", ".flac"];
var artFileTypes = [".jpg", ".jpeg", ".png"]
var minified_folder = "tempo_minified"
var playlist_folder = "tempo_playlists"

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
    playlistQuery = "CREATE TABLE playlists (id int AUTO_INCREMENT, "
        + "PRIMARY KEY (ID), playlist VARCHAR(255), picture VARCHAR(255))"
    playlistSongQuery = "CREATE TABLE playlist_songs (playlist int, "
        + "songID int, id int AUTO_INCREMENT, PRIMARY KEY(ID))"
    db.query(artistQuery, function(err, result) {
        if(err){
            dropTableQuery = "DROP TABLE artists";
            db.query(dropTableQuery, function(err, result){
                if(err) console.log(err);
                //else console.log("Table deleted");
                db.query(artistQuery, function(err, result){
                    if(err) throw err;
                    else {
                        console.log("Artist table created successfully");
                        createAlbumTable()
                    }
                });
            });
        }
        else {
            console.log("Artist table created successfully");
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
                            console.log("Album table created successfully");
                            createSongTable()
                        }
                    });
                });
            }
            else {
                console.log("Album table created successfully");
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
                    else console.log("Table deleted");
                    db.query(songQuery, function(err, result){
                        if(err) throw err;
                        else {
                            //console.log("Song table created successfully");
                            createPlaylistTable()
                        }
                    });
                });
            }
            else {
                console.log("Song table created successfully");
                createPlaylistTable();
            }
        });
    }
    function createPlaylistTable(){
        db.query(playlistQuery, function(err, result) {
            if(err){
                dropTableQuery = "DROP TABLE playlists";
                db.query(dropTableQuery, function(err, result){
                    if(err) console.log(err)
                    //else console.log("Table deleted")
                    db.query(playlistQuery, function(err, result){
                        if(err) throw err;
                        else{
                            console.log("Playlist table created successfully");
                            createPlaylistSongTable()
                        }
                    });
                });
            }
            else{
                console.log("Playlist table created successfully");
                createPlaylistSongTable()
            }
        });
    }
    function createPlaylistSongTable(){
        db.query(playlistSongQuery, function(err, result) {
            if(err){
                dropTableQuery = "DROP TABLE playlist_songs";
                db.query(dropTableQuery, function(err, result){
                    if(err) console.log(err)
                    //else console.log("Table deleted")
                    db.query(playlistSongQuery, function(err, result){
                        if(err) throw err;
                        else{
                            console.log("Playlist_songs table created successfully");
                            fillTables()
                        }
                    });
                });
            }
            else{
                console.log("Playlist_songs table created successfully");
                fillTables()
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

        //Scan for Artists, Albums, and Songs in one recursive loop
        fs.readdirSync(baseDir).forEach(artist => {
            if(artist == minified_folder || artist == playlist_folder) return;
            
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
            //Songs are inserted, scan for playlists now
            scanPlaylists()
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

        //Clear the tempo_minified directory
        var filesRemovedCounter = 0
        var minDirLoc = baseDir + minified_folder
        fs.readdirSync(minDirLoc).forEach(file => {
            fs.unlink(path.join(minDirLoc, file), err => {
                if(err) throw err
            });
            filesRemovedCounter++
        });

    function scanPlaylists(){
        //Call this after the songs table has been filled.
        //Scans the tempo_playlists folder for any playlists
        //Searches for .txt files containing playlist info.
        //playlist.txt has one song per line, the directory/filename of the song.
        var playlistDir = baseDir + playlist_folder;
        playlistQuery = "INSERT INTO playlists (playlist, picture) VALUES ?";
        playlistSongQuery = "INSERT INTO playlist_songs (playlist, songID) VALUES ?";
        var playlistRecords = [];
        var playlistSongRecords = [];
        var playlists = [];
        var files = fs.readdirSync(playlistDir)
        files.forEach(function(file, fileIndex, fileArr) {
            var playlist = prettyTitle(file.split(".")[0]);
            var extension = file.split(".")[1];
            if(extension != "playlist") return;
            var tup = Object.freeze([playlist]); //Maintains through db callback
            playlists.push(tup);
            playlistRecords.push([playlist, ""]);
            var fileLines = fs.readFileSync(playlistDir + "/" + file).toString().split("\n");
            fileLines.forEach(function(line, lineIndex, lineArr) {
                var dbQuery = "SELECT * FROM songs WHERE directory = " + db.escape(line);
                db.query(dbQuery, function(err, result){
                    if(err) throw err;
                    if(result[0] !== undefined){
                        var songID = result[0].id;
                        var playlistID =  (playlists.indexOf(tup) + 1);
                        playlistSongRecords.push([playlistID, songID]);
                    }
                    //If reached last line in last file, insert the found playlists into the DB.
                    if(fileIndex == fileArr.length - 1 && lineIndex == lineArr.length - 1){
                        insertPlaylists();
                    }
                });
            });
        });
        function insertPlaylists(){
            console.log(playlistRecords);
            console.log(playlistSongRecords);
            db.query(playlistQuery, [playlistRecords], function(err, result){
                if(result != undefined && result.affectedRows != undefined){
                    console.log("Inserted " + result.affectedRows + " playlists into library");
                }
                else{
                    console.log("Inserted 0 playlists into library");
                }
            });
            db.query(playlistSongQuery, [playlistSongRecords], function(err, result){
                if(result != undefined && result.affectedRows != undefined){
                    console.log("Inserted " + result.affectedRows + " playlist_songs into library");
                }
                else{
                    console.log("Inserted 0 playlist_songs into library");
                }
            });
        }
    }
}

function prettyTitle(title) {
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
        //console.log(result)
        return result;
  }
}