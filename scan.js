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

// Promise-based file listing.
function listDir (directory) {

	return new Promise((res, rej) => {

		fs.readdir(directory, (err, files) => {

			if (err) {
				rej(err);
			} else {
				res(files);
			}

		});

	});

}

// Reads the files in a directory and extracts info.
function readDirectory (directory, getInfo) {

	return listDir(directory).then((files) => {

		let info = files.map((file) => {
			return getInfo(directory, file);
		});

		return Promise.all(info).then((metadata) => {
			return metadata.filter((datum) => { return datum; });
		});

	});


}

// Resolves with an album object, or null if album is invalid.
function getAlbum (artistPath, albumDir) {

	let albumPath = path.join(artistPath, albumDir);

	return isDir(albumPath).then((validAlbum) => {

		if (validAlbum) {
			return { name: albumDir, dirname: albumDir };
		} else {
			return null;
		}

	});

}

// Resolves with an artist object, or null if artist is invalid.
function getArtist (libraryPath, artistDir) {

	let artistPath = path.join(libraryPath, artistDir);

	return isDir(artistPath).then((validArtist) => {

		if (validArtist) {

			let artist = { name: artistDir, dirname: artistDir };

			return readDirectory(artistPath, getAlbum).then((albums) => {

				artist.albums = albums;
				return artist;

			});

		} else {
			return null;
		}

	});

}

function diffMusic (db, library, currentSongs) {

	return readDirectory(library, getArtist);

}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((stored_songs) => {

		diffMusic(db, library, stored_songs).then((artists) => {
			console.log(artists[0]);
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
			syncMusic(db, library.path);
		}

	});

};
