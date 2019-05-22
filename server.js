#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const libraryScanner = require('./tempoServer/libraryScanner.js');
const sqlite = require('sqlite3');
const tempoServer = express();

//Get database password
databaseName = "tempoServer";

//Server options
const port = 8000;
tempoServer.use(bodyParser.urlencoded({extended: true}));
let baseDir = "/home/chris/Storage/Music/";
let shouldInitDatabase = false;

dbFile = './data.db';
let db = new sqlite.Database(dbFile, (err) => {
    if(err) {
        console.log("Error connecting to database");
    }
    else{
        console.log("Connected to database successfully");
        require('./tempoServer/routes')(tempoServer, db, baseDir)
        if(fs.statSync(dbFile).size < 4){
            shouldInitDatabase = true
        }

        if(shouldInitDatabase){
            libraryScanner.scanLibrary(db);
        }

        tempoServer.listen(port, () => {
            console.log("Listening on port: " + port);
        });
    }

});
