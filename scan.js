'use strict';

// ----- Requires ----- //

let fs = require('fs');

let Db = require('./db');


// ----- Functions ----- //

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((stored_songs) => {

		diffMusic(db, library, stored_songs).then((songsAdd) => {

			db.many(`INSERT INTO songs (name, artist, album, path)
				VALUES ($name, $artist, $album, $path)`, songsAdd);

		});

	});

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
