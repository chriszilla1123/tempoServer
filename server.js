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
shouldInitDatabase = false;

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
    tableQuery = "CREATE TABLE library (artist VARCHAR(255), album VARCHAR(255), "
        + "title VARCHAR(255), fileType VARCHAR(255), directory VARCHAR(255), "
        + "id int AUTO_INCREMENT, PRIMARY KEY (ID))";
    db.query(tableQuery, function(err, result) {
        if(err){
            dropTableQuery = "DROP TABLE library";
            db.query(dropTableQuery, function(err, result){
                if(err) console.log(err);
                else console.log("Table deleted");
                db.query(tableQuery, function(err, result){
                    if(err) throw err;
                    else {
                        console.log("Table created successfully");
                        getSongs()
                    }
                });
            });
        }
        else {
            console.log("Tabled created successfully");
            getSongs();
        }
    });
    
    //Finds all songs that meet the filetype restrictions, and inserts
    //Them into the database with one "INSERT INTO" op.
    function getSongs(){
        records = []
        songQuery = "INSERT INTO library (artist, album, title, fileType, directory) VALUES ?";
        
        fs.readdirSync(baseDir).forEach(artist => {
            if(fs.statSync(baseDir + artist).isDirectory()){
                artistDir = baseDir + artist + '/';
                fs.readdirSync(artistDir).forEach(album => {
                    if(fs.statSync(artistDir + album).isDirectory()){
                        albumDir = artistDir + album + '/';
                        fs.readdirSync(albumDir).forEach(title => {
                            if(fs.statSync(albumDir + title).isDirectory() == false){
                                songDir = albumDir + title;
                                relDir = artist + '/' + album + '/' + title;
                                
                                fileTypes.forEach(type => {
                                    if(title.indexOf(type) !== -1){
                                        title = title.split(type)[0];
                                        title = prettyTitle(title);
                                        record = [artist, album, title, type, relDir];
                                        records.push(record);
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
        db.query(songQuery, [records], function(err, result){
            if(err) throw err;
            console.log("Inserted " + result.affectedRows + " records into library");
        });
    }
}

var counter = 0
function prettyTitle(title) {
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
    console.log(title);
    title = title.split(regex);
    title = title[title.length - 1];
    console.log(title);
    console.log("----------");
  }
  });
  return title;
}