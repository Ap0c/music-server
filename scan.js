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

// Resolves with an song object, or null if song is invalid.
function readSongs (albumPath, filename) {

	let songPath = path.join(albumPath, filename);

	return isDir(songPath).then((invalidSong) => {

		if (invalidSong) {
			return null;
		}

		let songName = path.parse(filename).name;
		let leadingNumber = parseInt(songName.split(' ')[0]);
		let number = isNaN(leadingNumber) ? null : leadingNumber;

		return { name: songName, path: songPath, number: number };

	});

}

// Resolves with an album object, or null if album is invalid.
function readAlbum (artistPath, albumDir) {

	let albumPath = path.join(artistPath, albumDir);

	return isDir(albumPath).then((validAlbum) => {

		if (!validAlbum) {
			return null;
		}

		return readDirectory(albumPath, readSongs).then((songs) => {

			return { name: albumDir, dirname: albumPath, songs: songs };

		});

	});

}

// Resolves with an artist object, or null if artist is invalid.
function readArtist (libraryPath, artistDir) {

	let artistPath = path.join(libraryPath, artistDir);

	return isDir(artistPath).then((validArtist) => {

		if (!validArtist) {
			return null;
		}

		return readDirectory(artistPath, readAlbum).then((albums) => {

			return { name: artistDir, dirname: artistDir, albums: albums };

		});

	});

}


function getArtist (db, artist) {

	db.query('SELECT id FROM artists WHERE dirname = ?',
		artist.dirname).then((result) => {

		if (result.length === 0) {

			return db.insert(`INSERT INTO artists (name, dirname)
				VALUES ($name, $dirname)`, artist).then((rowId) => {

				return rowId;

			});

		}

		return result[0].id;

	});

}

function diffMusic (db, library, currentSongs) {

	return readDirectory(library, readArtist);

}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	db.query('SELECT path, id FROM songs').then((storedSongs) => {

		let currentSongs = {};

		storedSongs.forEach((song) => {
			currentSongs[song.path] = song.id;
		});

		diffMusic(db, library, currentSongs).then((artists) => {
			console.log(artists[0].albums[0]);
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
