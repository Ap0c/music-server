'use strict';

// ----- Requires ----- //

let fs = require('fs');

let Db = require('./db');


// ----- Functions ----- //

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	

}


// ----- Exports ----- //

module.exports = function scan (dbFile) {

	let db = Db(dbFile);

	db.query('SELECT * FROM libraries').then((libraries) => {

		for (var library of libraries) {
			syncMusic(db, library);
		}

	});

};
