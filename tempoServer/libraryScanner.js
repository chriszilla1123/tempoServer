const fs = require('fs');
const path = require('path');
const readline = require('readline');

let baseDir = getBaseDir()
const audioFileTypes = [".mp3", ".m4a", ".flac"];
const artFileTypes = [".jpg", ".jpeg", ".png"];
const minified_folder = "tempo_minified";
const playlist_folder = "tempo_playlists";
const ref = this;

function getBaseDir(){
    let fileName = "./basedir.txt";
    let lines = "";

    if(fs.existsSync(fileName)){
        const readInterface = readline.createInterface({
            input: fs.createReadStream(fileName),
            output: lines,
            console: false
        });
        if(fs.statSync(fileName).size <= 1){
            console.log("ERROR: Please enter a valid base directory in basedir.txt. Quitting.");
            process.exit(1);
        }
        readInterface.on('line', function(line){
            if(line.length === 0 || !fs.existsSync(line)){
                console.log("ERROR: Please enter a valid base directory in basedir.txt. Quitting.");
                process.exit(1);
            }
            if(!line.endsWith('/')){
                line = line + '/';
            }

            console.log("Using basedir: " + line);
            return line
        });
    }
    else{
        fs.appendFile(fileName, "", (err) => {

        });
        console.log("ERROR: Please enter a base directory location in basedir.txt. Quitting.");
        process.exit(1);
    }
}

//Regenerates the database, deletes the old table first.
exports.scanLibrary = function scanLibrary(db, callback) {
    //Drop old tables to start rescan. Subsequent operations are handled through callbacks.
    dropTables();

    function dropTables(){
        //Drop artist, album, and song tables before recreating.
        db.serialize(function(){
            let failure = false;
            db.run("DROP TABLE IF EXISTS artists", (err) => {
                if(err) {
                    console.log("Error dropping artist table");
                    failure = true;
                }
            });
            db.run("DROP TABLE IF EXISTS albums", (err) => {
                if(err) {
                    console.log("Error dropping albums table");
                    failure = true;
                }
            });
            db.run("DROP TABLE IF EXISTS songs", (err) => {
                if(err) {
                    console.log("Error dropping songs table");
                    failure = true;
                }
            });
            if(failure){
                //Failure, stop library scan
                console.log("Error scanning library, aborting...");
            }
            else{
                //successfully dropped tables, move on to recreating them
                createArtistTable();
            }
        });
    }

    function createArtistTable(){
        let artistQuery = "CREATE TABLE artists (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            + "artist VARCHAR(255), numSongs INTEGER, numAlbums INTEGER, picture VARCHAR(255))";


        db.serialize(function(){
            db.run(artistQuery, (err) => {
                if(err) {
                    console.log("Error creating artist table: " + err.toString());
                    console.log("Error scanning library, aborting...");
                }
                else{
                    console.log("Artist table created successfully");
                    createAlbumTable()
                }
            });
        });
    }

    function createAlbumTable(){
        let albumQuery = "CREATE TABLE albums (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            + "artist INTEGER, album VARCHAR(255), numSongs INTEGER, albumArt VARCHAR(255))";

        db.serialize(function(){
            db.run(albumQuery, (err) => {
                if(err) {
                    console.log("Error creating album table: " + err.toString());
                    console.log("Error scanning library, aborting...");
                }
                else{
                    console.log("Album table created successfully");
                    createSongTable()
                }
            });
        });
    }

    function createSongTable(){
        let songQuery = "CREATE TABLE songs (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            + "artist INTEGER, album INTEGER, title VARCHAR(255), fileType VARCHAR(255), fileSize INTEGER, "
            + "directory VARCHAR(255))";

        db.serialize(function(){
            db.run(songQuery, (err) => {
                if(err) {
                    console.log("Error creating song table: " + err.toString());
                    console.log("Error scanning library, aborting...");
                }
                else{
                    console.log("Song table created successfully");
                    fillTables()
                }
            });
        });
    }

    //Finds all songs that meet the filetype restrictions, and inserts
    //them into the database with one "INSERT INTO" op.
    function fillTables(){
        let artists = [];
        let albums = [];
        let artistRecords = [];
        let albumRecords = [];
        let songRecords = [];

        //Scan for Artists, Albums, and Songs in one recursive loop
        fs.readdirSync(baseDir).forEach(artist => {
            if(artist == minified_folder || artist == playlist_folder) return;
            
            if(fs.statSync(baseDir + artist).isDirectory){
                let artistDir = baseDir + artist + '/';
                artists.push(artist);
                if(artistIsRecorded(artist) === false){
                    artistRecords.push([artist, 0, 0, ""]);
                }
                fs.readdirSync(artistDir).forEach(album => {
                    if(fs.statSync(artistDir + album).isDirectory()){
                        let albumDir = artistDir + album + '/';
                        let artistNumber = artists.indexOf(artist) + 1;
                        if(albumIsRecorded(artist, album) === false){
                            tup = Object.freeze([artist, album]);
                            albums.push(tup);
                            let albumArt = findArtwork(albumDir);
                            albumRecords.push([artistNumber, album, 0, albumArt]);
                            artistRecords[artistNumber - 1][2] += 1;
                        }
                        fs.readdirSync(albumDir).forEach(title => {
                            let fileStats = fs.statSync(albumDir + title);
                            if(fileStats.isDirectory() == false){
                                let relDir = artist + '/' + album + '/' + title;
                                let albumNumber = (albums.indexOf(tup) + 1);
                                audioFileTypes.forEach(type => {
                                    if(title.indexOf(type) !== -1){
                                        title = title.split(type)[0];
                                        title = prettyTitle(title); //Cleans unwanted chars, hyphens, dots, etc.
                                        let fileSize = fileStats.size; //Gets file in bytes
                                        songRecords.push([artistNumber, albumNumber, title, type, fileSize, relDir]);
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

        let artistQuery = "INSERT INTO artists (artist, numSongs, numAlbums, picture) VALUES (?, ?, ?, ?)";
        let albumQuery = "INSERT INTO albums (artist, album, numSongs, albumArt) VALUES (?, ?, ?, ?)";
        let songQuery = "INSERT INTO songs (artist, album, title, fileType, fileSize, directory) VALUES (?, ?, ?, ?, ?, ?)";

        //Run the statements in a single transaction.
        //This provides an approximately 10x performance increase by including the 'BEGIN' and 'COMMIT' lines.
        db.serialize(function(){
            db.exec("BEGIN TRANSACTION;");
            artistRecords.forEach((artist) => {
                db.run(artistQuery, artist);
            });
            albumRecords.forEach((album) => {
                db.run(albumQuery, album);
            });
            songRecords.forEach((song) => {
                db.run(songQuery, song);
            });
            db.exec("COMMIT;");
            db.exec("", function(){
                //this callback will run after the above insertions are finished, due to serialization.
                let numArtists = artistRecords.length;
                let numAlbums = albumRecords.length;
                let numSongs = songRecords.length;
                console.log(`Added ${numArtists} artists, ${numAlbums} albums, and ${numSongs} songs to the library`);

                //songs are inserted, scan for playlists now.
                ref.scanPlaylists(db)
            })
        });

        function artistIsRecorded(artist){
            for(var i=0; i < artistRecords.length; i++){
                if(artistRecords[i][0] == artist) return true;
            }
            return false;
        }
        function albumIsRecorded(artist, album){
            for(var i=0; i < albumRecords.length; i++){
                if(albumRecords[i][1] == album && albumRecords[i][0] == artist) return true;
            }
            return false;
        }
        //Write timestamp and call callback
        var timestampLoc = "lastLibraryUpdate";
        var curTime = Date.now().toString();
        fs.writeFile(timestampLoc, curTime, function(err) {
            if(err) console.log(err)
        });

        //Clear the tempo_minified directory
        var filesRemovedCounter = 0;
        var minDirLoc = baseDir + minified_folder;
        fs.readdirSync(minDirLoc).forEach(file => {
            fs.unlink(path.join(minDirLoc, file), err => {
                if(err) throw err
            });
            filesRemovedCounter++
        });
        if(callback) callback()
}

  function findArtwork(dir) {
      /*Accepts a filesystem absolute location, and returns the location of the
        first supported image file, relative to the base dir. If none is found,
        returns an empty string.
        */
        result = '';
        var files = fs.readdirSync(dir);
        scan:
        for(var i = 0; i < files.length; i++){
            var file = files[i];
            for(var j=0; j <= artFileTypes.length; j++){
                var type = artFileTypes[j];
                if(file.indexOf(type) != -1) { //Artwork file found
                    result = dir + file;

                    //Strip the base dir, and leave only the relative dir
                    result = result.replace(baseDir, '');
                    break scan;
                }
            }
        }
        //console.log(result)
        return result;
  }
};

exports.scanPlaylists = function scanPlaylists(db, callback) {
    //Call this after the songs table has been filled.
    //Scans the tempo_playlists folder for any playlists
    //Searches for .txt files containing playlist info.
    //playlist.txt has one song per line, the directory/filename of the song.
    var playlistDir = baseDir + playlist_folder;
    var playlistRecords = [];
    var playlistSongRecords = [];
    var playlists = [];
    var files = fs.readdirSync(playlistDir);
    createPlaylistTable();


    function createPlaylistTable(){
        let playlistQuery = "CREATE TABLE playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            + "playlist VARCHAR(255), playlistArt VARCHAR(255))";

        db.serialize(function(){
            db.run("DROP TABLE IF EXISTS playlists");
            db.run(playlistQuery, (err) => {
                if(err) { console.log(err.toString()) }
                else{
                    console.log("Playlist table created successfully");
                    createPlaylistSongTable()
                }
            });
        });
    }
    function createPlaylistSongTable(){
        let playlistSongQuery = "CREATE TABLE playlist_songs (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            + "playlist INTEGER, songId INTEGER)";

        db.serialize(function(){
            db.run("DROP TABLE IF EXISTS playlist_songs");
            db.run(playlistSongQuery, (err) => {
                if(err) { console.log(err.toString()) }
                else{
                    console.log("Playlist Song table created successfully");
                    scanAndInsert();
                }
            })
        });
    }

    function scanAndInsert(){
        files.forEach(function(file, fileIndex, fileArr) {
            var playlist = prettyTitle(file.split(".")[0]);
            var extension = file.split(".")[1];
            if(extension != "playlist") return;
            var tup = Object.freeze([playlist]); //Maintains through db callback
            playlists.push(tup);
            playlistRecords.push([playlist, ""]);
            var fileLines = fs.readFileSync(playlistDir + "/" + file).toString().split("\n");

            fileLines.forEach(function(line, lineIndex, lineArr) {
                var dbQuery = "SELECT id FROM songs WHERE directory = ?";

                db.get(dbQuery, [line], (err, row) => {
                    if(err) throw err;
                    if(row !== undefined && row.hasOwnProperty('id')){
                        let songID = row.id
                        let playlistID = (playlists.indexOf(tup) + 1);
                        playlistSongRecords.push([playlistID, songID]);
                    }
                    //If reached last line in last file, insert the found playlists into the DB.
                    if(fileIndex === fileArr.length - 1 && lineIndex === lineArr.length - 1){
                        insertPlaylists();
                    }
                });
            });
        });

        function insertPlaylists(){
            let playlistInsertQuery = "INSERT INTO playlists (playlist, playlistArt) VALUES (?, ?)";
            let playlistSongInsertQuery = "INSERT INTO playlist_songs (playlist, songId) VALUES (?, ?)";

            db.serialize(function(){
                db.exec("BEGIN TRANSACTION;");
                playlistRecords.forEach((playlist) => {
                    db.run(playlistInsertQuery, playlist);
                });
                playlistSongRecords.forEach((song) => {
                    db.run(playlistSongInsertQuery, song);
                });
                db.exec("COMMIT;");
                db.exec("", function(){
                    //This call back will run after playlist info is inserted into the database
                    let numPlaylists = playlistRecords.length;
                    let numSongs = playlistSongRecords.length;
                    console.log(`Added ${numSongs} songs into ${numPlaylists} playlists`);
                    updateTimestamp();
                });
            });
        }
    }

    function updateTimestamp(){
        //Write timestamp and call callback
        var timestampLoc = "lastPlaylistUpdate";
        var curTime = Date.now().toString();
        fs.writeFile(timestampLoc, curTime, function(err) {
            if(err) console.log(err)
        });
        if(callback) callback()
    }
};

function prettyTitle(title) {
    regexs = [
      /\d\s\-\s/,
      /\d\s\-/,
      /\d\s/,
      /\d\./,
      /\-\s/
      ];
  
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

