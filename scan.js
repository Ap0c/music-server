'use strict';

// ----- Requires ----- //

let fs = require('fs');

let Db = require('./db');


// ----- Functions ----- //

function diffMusic (db, library, currentSongs) {



}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((stored_songs) => {

		diffMusic(db, library, stored_songs).then((songsDiff) => {

			let insertions = [
				db.many(`INSERT INTO songs (name, artist, album, path)
					VALUES ($name, $artist, $album, $path)`, songsDiff.add),
				db.many('DELETE FROM songs WHERE id = ?', songsDiff.delete),
				db.many('DELETE FROM artists WHERE id = ?', songsDiff.artists),
				db.many('DELETE FROM albums WHERE id = ?', songsDiff.albums)
			];

			Promise.all(insertions);

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
