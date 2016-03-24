'use strict';

// ----- Requires ----- //

let fs = require('fs');
let path = require('path');

let Db = require('./db');


// ----- Functions ----- //

// Checks if something is a directory.
function isDir (path, directory) {

	return new Promise((res, rej) => {

		let fullpath = path.join(path, directory);

		fs.stat(fullpath, (err, stats) => {

			if (err) {
				rej(err);
			} else {
				res(stats.isDirectory());
			}

		});

	});

}

function readArtists (library) {

	let artists = [];
	let libraryPath = library.path;

	fs.readdir(library, (err, files) => {

		let checkDirs = [];

		for (let file of files) {
			checkDirs.push(isDir(library, file));
		}

		Promise.all(checkDirs).then((valids) => {

			for (var i = files.length - 1; i >= 0; i--) {

				if (valids[i]) {
					artists.append({ name: files[i], dirname: files[i] });
				}

			}

		});

	});

}

function diffMusic (db, library, currentSongs) {

	let toAdd = [];
	let artists = readArtists(library);

}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((stored_songs) => {

		diffMusic(db, library, stored_songs).then((songsDiff) => {

			let synchronisations = [
				db.many(`INSERT INTO songs (name, artist, album, path)
					VALUES ($name, $artist, $album, $path)`, songsDiff.add),
				db.many('DELETE FROM songs WHERE id = ?', songsDiff.delete),
				db.many('DELETE FROM artists WHERE id = ?', songsDiff.artists),
				db.many('DELETE FROM albums WHERE id = ?', songsDiff.albums)
			];

			Promise.all(synchronisations);

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
