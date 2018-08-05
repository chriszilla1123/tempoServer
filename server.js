const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const lineReader = require('readline');
const fs = require('fs');
const tempoServer = express();

//Get database password
passwordLoc = '/etc/passwords/tempoServerPass';
password = fs.readFileSync(passwordLoc).toString().split('\n')[0];

//Server options
const port = 8000;
tempoServer.use(bodyParser.urlencoded({extended: true}));
var baseDir = "/home/chris/Storage/Music/";
var fileTypes = [".mp3", ".m4a", ".flac"];
shouldInitDatabase = true;

//Database connection object
var db = mysql.createConnection({
    host: "localhost",
    user: "musicserver",
    password: password,
    database: "musicserver"
});

//Establish database connection
db.connect(function(err) {
    if (err) throw err;
    console.log('Connected to database!');
    require('./tempoServer/routes')(tempoServer, db, baseDir);
    
    if(shouldInitDatabase) {
            initDatabase(db)
        }
    
    tempoServer.listen(port, () => {
        console.log("Listening on port: " + port);
    });
});

//Regenerates the database, deletes the old table first.
function initDatabase(db) {
    databaseName = "musicserver";
    artistQuery = "CREATE TABLE artists (id int AUTO_INCREMENT, "
        + "PRIMARY KEY (ID), artist VARCHAR(255), numSongs int, "
        + "numAlbums int, picture VARCHAR(255))";
    albumQuery = "CREATE TABLE albums (id int AUTO_INCREMENT, "
        + "PRIMARY KEY (ID), album VARCHAR(255), numSongs int, "
        + "albumArt VARCHAR(255))";
    songQuery = "CREATE TABLE songs (artist int, album int, "
        + "title VARCHAR(255), fileType VARCHAR(255), directory VARCHAR(255), "
        + "id int AUTO_INCREMENT, PRIMARY KEY (ID))";
    db.query(artistQuery, function(err, result) {
        if(err){
            dropTableQuery = "DROP TABLE artists";
            db.query(dropTableQuery, function(err, result){
                if(err) console.log(err);
                else console.log("Table deleted");
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
                    else console.log("Table deleted");
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
                            console.log("Song table created successfully");
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
    //Them into the database with one "INSERT INTO" op.
    function fillTables(){
        artists = [];
        albums = []
        artistRecords = [];
        albumRecords = [];
        songRecords = [];
        artistQuery = "INSERT INTO artists (artist, numSongs, numAlbums, picture) VALUES ?";
        albumQuery = "INSERT INTO albums (album, numSongs, albumArt) VALUES ?";
        songQuery = "INSERT INTO songs (artist, album, title, fileType, directory) VALUES ?";
        
        fs.readdirSync(baseDir).forEach(artist => {
            if(fs.statSync(baseDir + artist).isDirectory()){
                artistDir = baseDir + artist + '/';
                artists.push(artist);
                if(artistIsRecorded(artist) === false){
                    artistRecords.push([artist, 0, 0, ""]);
                }
                fs.readdirSync(artistDir).forEach(album => {
                    if(fs.statSync(artistDir + album).isDirectory()){
                        albumDir = artistDir + album + '/';
                        albums.push(album);
                        if(albumIsRecorded(album) === false){
                            albumRecords.push([album, 0, ""]);
                        }
                        fs.readdirSync(albumDir).forEach(title => {
                            if(fs.statSync(albumDir + title).isDirectory() == false){
                                relDir = artist + '/' + album + '/' + title;
                                fileTypes.forEach(type => {
                                    if(title.indexOf(type) !== -1){
                                        title = title.split(type)[0];
                                        title = prettyTitle(title);
                                        artistNumber = artists.indexOf(artist) + 1;
                                        albumNumber = albums.indexOf(album) + 1;
                                        songRecords.push([artistNumber, albumNumber, title, type, relDir]);
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
        console.log(artists);
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
        function albumIsRecorded(album){
            for(var i=0; i < albumRecords.length; i++){
                if(albumRecords[i][0] == album) return true;
            };
            return false;
        };
    }
}

var counter = 0
function prettyTitle(title) { //TODO: Fix this
  regexs = [
    /\d\s\-\s/,
    /\d\s\-/,
    /\d\s/,
    /\d\./,
    /\-\s/
    ]
  //console.log('test' + ++counter);

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