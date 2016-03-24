'use strict';

// ----- Requires ----- //

let fs = require('fs');
let path = require('path');

let Db = require('./db');


// ----- Functions ----- //

// Checks if something is a directory.
function isDir (directory) {

	return new Promise((res, rej) => {

		fs.stat(directory, (err, stats) => {

			if (err) {
				rej(err);
			} else {
				res(stats.isDirectory());
			}

		});

	});

}

// Reads the files in a directory and extracts info.
function readDirectory (directory, getInfo) {

	return new Promise((res, rej) => {

		fs.readdir(directory, (err, files) => {

			if (err) {
				rej(err);
			}

			let info = files.map((file) => {
				return getInfo(directory, file);
			});

			Promise.all(info).then((metadata) => {
				res(metadata.filter((datum) => { return datum; }));
			});

		});

	});

}

// Resolves with an album object, or null if album is invalid.
function getAlbum (artistPath, albumDir) {

	return new Promise((res, rej) => {

		let albumPath = path.join(artistPath, albumDir);

		isDir(albumPath).then((validAlbum) => {

			if (validAlbum) {
				res({ name: albumDir, dirname: albumDir });
			} else {
				res(null);
			}

		});

	});

}

// Resolves with an artist object, or null if artist is invalid.
function getArtist (libraryPath, artistDir) {

	return new Promise((res, rej) => {

		let artistPath = path.join(libraryPath, artistDir);

		isDir(artistPath).then((validArtist) => {

			if (validArtist) {

				let artist = { name: artistDir, dirname: artistDir };

				readDirectory(artistPath, getAlbum).then((albums) => {

					artist.albums = albums;
					res(artist);

				});

			} else {
				res(null);
			}

		});

	});

}


function diffMusic (db, library, currentSongs) {

	return new Promise((res, rej) => {

		let toAdd = [];

		readDirectory(library.path, getArtist).then(res);

	});

}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((stored_songs) => {

		diffMusic(db, library, stored_songs).then((artists) => {
			console.log(artists);
		});

		// .then((songsDiff) => {

			// let synchronisations = [
			// 	db.many(`INSERT INTO songs (name, artist, album, path)
			// 		VALUES ($name, $artist, $album, $path)`, songsDiff.add),
			// 	db.many('DELETE FROM songs WHERE id = ?', songsDiff.delete),
			// 	db.many('DELETE FROM artists WHERE id = ?', songsDiff.artists),
			// 	db.many('DELETE FROM albums WHERE id = ?', songsDiff.albums)
			// ];

			// Promise.all(synchronisations);

		// });

	}).catch((err) => {
		console.log(err);
	});

}


// ----- Exports ----- //

module.exports = function scan (dbFile) {

	let db = Db(dbFile);

	db.query('SELECT * FROM libraries').then((libraries) => {

		for (let library of libraries) {
			syncMusic(db, library);
		}

	});

};
