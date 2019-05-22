const fs = require('fs');
const path = require('path');
const id3 = require('node-id3')

//ID3 Tags, for mp3 files
exports.readID3Tags = function readTags(fileLoc){
    let noTagError = {error: "No tags found"};
    if(fs.existsSync(fileLoc)){
        let tags = id3.read(fileLoc);
        if(tags == false){
            return noTagError;
        }
        return tags;
    }
    else{
        return noTagError;
    }
};

exports.writeID3Tags = function writeTags(fileLoc){

}