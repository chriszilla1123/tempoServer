let fs = require('fs');
let cors = require('cors');
let bodyParser = require('body-parser');
const libraryScanner = require('../libraryScanner.js');
const tagManager = require('../tagManager.js');
const {spawn} = require('child_process');
const playlistDir = "/tempo_playlists";

//Define errors
const unsupportedFileTypeError = {error: "Unsupported File Type"};

module.exports = function (tempoServer, db, baseDir) {
    //tempoServer.use(cors());
    tempoServer.use(bodyParser.json());

    tempoServer.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
      });

    //Global Values
    function setTypeHeader(fileType) {
        let header_mp3 = "audio/mpeg";
        let header_m4a = "audio/mpeg";
        let header_flac = "audio/flac";
        let header_jpeg = "image/jpeg";
        let header_png = "image/png";

        if (fileType === ".mp3") return header_mp3;
        if (fileType === ".m4a") return header_m4a;
        if (fileType === ".flac") return header_flac;
        if (fileType === ".jpeg" || fileType === ".jpg") return header_jpeg;
        if (fileType === ".png") return header_png;
    }

    function compressSong(songId, songDir, songType, res) {
        //Compresses a song, and returns a string of the new directory
        let largeSong = baseDir + songDir;
        let min_folder = baseDir + "/tempo_minified";
        let minSong = min_folder + "/" + songId + ".mp3";

        if (!fs.existsSync(min_folder)) {
            fs.mkdirSync(min_folder)
        }
        if (fs.existsSync(minSong)) {
            res.header("Content-Type", setTypeHeader(".mp3"));
            let songStream = fs.createReadStream(minSong);
            songStream.pipe(res);
        } else {
            let bitrate = '96k';
            let convert = spawn('ffmpeg', ['-i', largeSong, '-b:a', bitrate, minSong]);
            convert.on('close', respCode => {
                //console.log(respCode)
                res.header("Content-Type", setTypeHeader(".mp3"));
                let songStream = fs.createReadStream(minSong);
                songStream.pipe(res);
            })
        }

    }

    //Database dump endpoints
    tempoServer.get('/getArtists', (req, res) => {
        let dbQuery = "SELECT *  FROM artists";
        db.all(dbQuery, function(err, rows){
            if(err){
                res.send(err);
            } else{
                res.send(rows);
            }
        });
    });
    tempoServer.get('/getAlbums', (req, res) => {
        let dbQuery = "SELECT *  FROM albums";
        db.all(dbQuery, function(err, rows){
            if(err){
                res.send(err);
            } else{
                res.send(rows);
            }
        });
    });

    tempoServer.get('/getSongs', (req, res) => {
        let dbQuery = "SELECT * FROM songs";
        db.all(dbQuery, function(err, rows){
            if(err){
                res.send(err);
            } else{
                res.send(rows);
            }
        });
    });
    tempoServer.get('/getPlaylists', (req, res) => {
        let dbQuery = "SELECT * FROM playlists;";
        db.all(dbQuery, function(err, rows){
           if(err){
               res.send(err);
           } else{
               res.send(rows);
           }
        });
    });
    tempoServer.get('/getPlaylistSongs', (req, res) => {
        let dbQuery = "SELECT * FROM playlist_songs;";
        db.all(dbQuery, function(err, rows){
            if(err) {
                res.send(err)
            } else {
                res.send(rows)
            }
        });
    });
    //End Database dump endpoints

    //Song endpoints
    tempoServer.get('/getAlbumsByArtist/:id', (req, res) => {
        const id = req.params.id;
        let dbQuery = "SELECT * FROM albums WHERE artist = ?";
        db.all(dbQuery, [id], function(err, rows){
            if (err) {
                res.send(err);
            } else {
                res.send(rows);
            }
        });
    });

    tempoServer.get('/getArtistByAlbum/:id', (req, res) => {
        const id = req.params.id;
        let dbQuery = "SELECT * FROM albums WHERE id = ?";
        db.all(dbQuery, [id], function(err, rows){
            if (err) {
                res.send(err);
            } else {
                if (rows.length === 0) {
                    console.log("Error: No results found for: '" + id + "'");
                    return;
                }
                res.send(rows[0].artist.toString());
            }
        });
    });

    tempoServer.get('/getSongByID/:id', (req, res) => {
        const id = req.params.id;
        let dbQuery = "SELECT * FROM songs WHERE id = ?";
        db.all(dbQuery, [id], function (err, rows) {
            if (err) {
                res.send(err);
            } else {
                if (rows.length === 0) {
                    console.log("Error: No results found for '" + id + "'");
                    return;
                }
                if (rows[0].hasOwnProperty('directory')) {
                    let song = baseDir + rows[0].directory;
                    let fileType = rows[0].fileType;
                    res.header("Content-Type", setTypeHeader(fileType));
                    let songStream = fs.createReadStream(song);
                    songStream.pipe(res);
                } else {
                    console.log("Error: 'directory' not found for " + id);
                }
            }
        });
    });

    tempoServer.get('/getLowSongByID/:id', (req, res) => {
        const id = req.params.id;
        let dbQuery = "SELECT * FROM songs WHERE id=?";
        db.all(dbQuery, [id], function (err, rows) {
            if (err) {
                res.send(err);
            } else {
                if (rows.length == 0) {
                    console.log("Error: No results found for '" + id + "'");
                    return;
                }
                if (rows[0].hasOwnProperty('directory')) {
                    //song = baseDir + result[0].directory;
                    let fileType = rows[0].fileType;
                    compressSong(id, rows[0].directory, fileType, res);
                }
            }
        });
    });

    tempoServer.get('/getRandomSong', (req, res) => {
        let dbQuery = 'SELECT * FROM songs';
        let dbArtistQuery = 'SELECT artist FROM artists WHERE id=?';
        db.serialize(function(){
            db.all(dbQuery, function (err, rows) {
                if (err) {
                    res.send(err);
                } else {
                    length = rows.length;
                    let songIndex = Math.floor(Math.random() * Math.floor(length));
                    let song = baseDir + rows[songIndex].directory;
                    let fileType = rows[songIndex].fileType;
                    res.header("Content-Type", setTypeHeader(fileType));
                    let songStream = fs.createReadStream(song);
                    songStream.pipe(res);
                }
            });
        });
    });

    tempoServer.get('/getSongsByArtist/:artist', (req, res) => {
        const artist = req.params.artist;
        let dbQuery = "SELECT * FROM songs WHERE artist = ?";
        db.all(dbQuery, [artist], function (err, rows) {
            if (err) {
                res.send(err);
            } else {
                res.send(rows);
            }
        });
    });

    tempoServer.get('/getRandomSongByArtist/:artist', (req, res) => {
        const artist = req.params.artist;
        let dbQuery = "SELECT * FROM songs WHERE artist = ?";
        db.all(dbQuery, [artist], function (err, rows) {
            if (err) {
                res.send(err);
            } else {
                length = rows.length;
                songIndex = Math.floor(Math.random() * Math.floor(length));
                song = baseDir + rows[songIndex].directory;
                songStream = fs.createReadStream(song);
                songStream.pipe(res);
            }
        });
    });

    tempoServer.post('/search', (req, res) => {
        const json = req.body;

        let artistResults = [];
        let albumResults = [];
        let songResults = [];
        let searchResults = [];
        if (json.hasOwnProperty('all')) {
            let dbQuery = "SELECT * FROM artists WHERE artist LIKE ?";
            let searchString = `%${json.all}%`;
            db.serialize(function(){
                db.all(dbQuery, [searchString], function (err, result) {
                    if (err) res.send(err);
                    else {
                        artistResults.push(result);
                        dbQuery = "SELECT * FROM albums WHERE album LIKE ?";
                        db.serialize(function(){
                            db.all(dbQuery, [searchString], function (err, result) {
                                if (err) res.send(err);
                                else {
                                    albumResults.push(result);
                                    dbQuery = "SELECT * FROM songs WHERE title LIKE ?";
                                    db.serialize(function(){
                                        db.all(dbQuery, [searchString],function (err, result) {
                                            if (err) res.send(err);
                                            else {
                                                songResults.push(result);
                                                searchResults.push(artistResults);
                                                searchResults.push(albumResults);
                                                searchResults.push(songResults);
                                                res.send(searchResults);
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    }
                });
            });
        } else {
            console.log('err');
            res.send(req.body);
        }
    });

    tempoServer.put('/updateArtistInfo/:id', (req, res) => {
        const artist = req.params.id;
        const json = req.body;
        if (json.hasOwnProperty('artist')) {
            let dbQuery = 'UPDATE artists SET artist=?' + 'WHERE id=?';
            db.all(dbQuery, [artist, artist], function (err, result) {
                if (err) res.send(err);
                else {
                    console.log('Updated artist #' + artist + ' to name ' + json.artist);
                    res.send(result);
                }
            });
        }
    });

    tempoServer.get('/getAlbumArtById/:id', (req, res) => {
        const id = req.params.id;
        //console.log("Requesting art for album id: " + id);
        let dbQuery = "SELECT albumArt FROM albums WHERE id=?";
        db.all(dbQuery, [id], function (err, result) {
            if (err) {
                console.log("Error in /getAlbumArtById/:id endpoint");
                console.log(err);
                res.send("");
            } else {
                if (result[0].albumArt === "") {
                    res.send("");
                } else {
                    let fileLoc = result[0].albumArt;
                    let fileType = fileLoc.slice(fileLoc.indexOf("."));
                    res.header("Content-Type", setTypeHeader(fileType));
                    let artStream = fs.createReadStream(baseDir + fileLoc);
                    artStream.pipe(res);
                }
            }
        });
    });

    //Administrative endpoints
    tempoServer.get('/ping', (req, res) => {
        res.send('pong');
    });
    tempoServer.get('/rescanLibrary', (req, res) => {
        console.log("Received Library Rescan Request");
        libraryScanner.scanLibrary(db, onSuccess);

        function onSuccess() {
            console.log("Library rescan successful");
            res.send(true);
        }
    });
    tempoServer.get('/rescanPlaylists', (req, res) => {
        console.log("Received Playlist Rescan Request");
        libraryScanner.scanPlaylists(db, onSuccess);

        function onSuccess() {
            console.log("Playlist rescan successful");
            res.send(true)
        }
    });
    tempoServer.get('/id3Title', (req, res) => {
        if(req.query.songID){
            let songID = req.query.songID
            let dbQuery = "SELECT * FROM songs WHERE id=";
            db.all(dbQuery, [songID], function (err, result) {
                if (err) res.send(err);
                else {
                    if (result.length === 0) {
                        console.log("Error: No results found for '" + songID + "'");
                        res.send("error")
                        return;
                    }
                    if (result[0].hasOwnProperty('directory')) {
                        song = baseDir + result[0].directory;
                        fileType = result[0].fileType;
                        //res.header("Content-Type", setTypeHeader(fileType));
                        //songStream = fs.createReadStream(song);
                        //songStream.pipe(res);
                        if(fileType === ".mp3"){
                            tags = tagManager.readTags(song);
                            res.send(tags);
                        }
                        else{
                            let error = unsupportedFileTypeError;
                            error.message = "Tags are not currently supported for filetype [" + fileType + "]";
                            res.send(error);
                        }
                    } else {
                        console.log("Error: 'directory' not found for " + id);
                    }
                }
            });
        }
        else{
            res.send("No songID")
        }
    });

    //Update Playlist Info
    tempoServer.get('/createPlaylist', (req, res) => {
        if (req.query.playlistName) {
            playlistName = decodeURI(req.query.playlistName);
            playlistFileLoc = baseDir + playlistDir + "/"
                + playlistName + ".playlist";
            try {
                fs.writeFileSync(playlistFileLoc, "", {flag: 'wx'});
                res.send(true)
            } catch (e) {
                res.send(false)
            }
        } else {
            res.send("No playlist name posted")
        }
    });

    tempoServer.get('/addSongToPlaylist', (req, res) => {
        if (req.query.playlistName && req.query.songDir) {
            const playlistName = req.query.playlistName;
            let songDir = req.query.songDir + "\n";
            let playlistFileLoc = baseDir + playlistDir + "/"
                + playlistName + ".playlist";
            let songExists = false;
            try {
                var fileLines = fs.readFileSync(playlistFileLoc).toString().split("\n");
                fileLines.forEach(function (line, lineIndex, lineArr) {
                    if (line.trim() === songDir.trim()) songExists = true;
                });
            } catch (e) {
                console.log(e);
            }
            if (!songExists) {
                try {
                    fs.writeFileSync(playlistFileLoc, songDir, {flag: "a"});
                    res.send(true);
                    console.log("Added " + songDir.trim() + " to " + playlistName.trim());
                } catch (e) {
                    res.send(false);
                }
            } else {
                res.send(false);
                console.log(songDir.trim() + " is already in " + playlistName.trim());
            }
        } else {
            let response = "";
            if (!req.query.playlistName) {
                response += "[Missing Playlist Name]";
            }
            if (!req.query.songDir) {
                response += "[Missing Song Dir]";
            }
            res.send(response);
        }
    });

    tempoServer.get('/removeSongFromPlaylist', (req, res) => {
        if (req.query.playlistName && req.query.songDir) {
            const playlistName = req.query.playlistName;
            const songDir = req.query.songDir;
            let playlistFileLoc = baseDir + playlistDir + "/"
                + playlistName + ".playlist";
            let newPlaylistFile = "";
            let removedLines = [];
            try {
                let fileLines = fs.readFileSync(playlistFileLoc).toString().split("\n");
                fileLines.forEach(function (line, lineIndex, lineArr) {
                    //Add lines that don't match to the new file, excluding the lines
                    //matching to remove the song.
                    if (line.trim() != songDir.trim()) {
                        newPlaylistFile += (line.trim() + "\n");
                    } else {
                        removedLines.push(line.trim())
                    }
                });
                //rewrite the file
                fs.writeFileSync(playlistFileLoc, newPlaylistFile);
                if (removedLines.length > 0) {
                    console.log("Removed " + removedLines.length + " songs from [" + playlistName + "]");
                    removedLines.forEach(function (line, index, arr) {
                        console.log(line)
                    });
                    console.log("END REMOVED LINES");
                    res.send(true);
                } else {
                    res.send(false);
                    console.log("[" + songDir + "] not found in [" + playlistName + "], failed to remove");
                }
            } catch (e) {
                console.log("Error removing [" + songDir + "] from [" + playlistName + "]");
                console.log(e);
                res.send(false)
            }
        } else {
            let response = "";
            if (!req.query.playlistID) {
                response += "[Missing Playlist Name]";
            }
            if (!req.query.songDir) {
                response += "[Missing Song Dir]";
            }
            res.send(response)
        }
    });
    //End Update Playlist Info

    tempoServer.get('/getLastLibraryUpdate', (req, res) => {
        fs.readFile('lastLibraryUpdate', (err, data) => {
            if (err) {
                console.log(err);
                res.send("0") //Must need update
            } else {
                res.send(data.toString());
            }
        })
    });

    tempoServer.get('/getLastPlaylistUpdate', (req, res) => {
        fs.readFile('lastPlaylistUpdate', (err, data) => {
            if (err) {
                console.log(err);
                res.send("0") //Must need update
            } else {
                res.send(data.toString());
            }
        })
    });
};
