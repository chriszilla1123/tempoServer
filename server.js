#!/usr/bin/env node

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const lineReader = require('readline');
const fs = require('fs');
const tempoServer = express();
const libraryScanner = require('./tempoServer/libraryScanner.js')

//Get database password
passwordLoc = '/etc/passwords/tempoServerPass';
password = fs.readFileSync(passwordLoc).toString().split('\n')[0];

//Server options
const port = 8000;
tempoServer.use(bodyParser.urlencoded({extended: true}));
var baseDir = "/home/chris/Storage/Music/";
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
            libraryScanner.initDatabase(db)
        }
    
    tempoServer.listen(port, () => {
        console.log("Listening on port: " + port);
    });
});
