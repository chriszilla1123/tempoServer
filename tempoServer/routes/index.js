const noteRoutes = require('./routes');
module.exports = function(tempoServer, db, baseDir) {
    noteRoutes(tempoServer, db, baseDir);
}