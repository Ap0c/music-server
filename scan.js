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
function readDirectory (directory, relativePath, getInfo) {

	return listDir(directory).then((files) => {

		let info = files.map((file) => {
			return getInfo(directory, relativePath, file);
		});

		return Promise.all(info).then((metadata) => {
			return metadata.filter((datum) => { return datum; });
		}).catch((err) => {
			console.log(err);
		});

	});

}

// Resolves with an song object, or null if song is invalid.
function readSongs (albumPath, dirname, filename) {

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
function readAlbum (artistPath, relativePath, albumDir) {

	let albumPath = path.join(artistPath, albumDir);
	let dirname = path.join(relativePath, albumDir);

	return isDir(albumPath).then((validAlbum) => {

		if (!validAlbum) {
			return null;
		}

		return readDirectory(albumPath, dirname, readSongs).then((songs) => {

			return { name: albumDir, dirname: dirname, songs: songs };

		});

	});

}

// Resolves with an artist object, or null if artist is invalid.
function readArtist (libraryPath, relativePath, artistDir) {

	let artistPath = path.join(libraryPath, artistDir);
	let dirname = path.join(relativePath, artistDir);

	return isDir(artistPath).then((validArtist) => {

		if (!validArtist) {
			return null;
		}

		return readDirectory(artistPath, dirname, readAlbum).then((albums) => {

			return { name: artistDir, dirname: dirname, albums: albums };

		});

	});

}

// Retrieves the id of an artist, adding it to database where necessary.
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

// Retrieves the full set of data on artists, albums and songs.
function diffMusic (db, library, currentSongs) {

	return readDirectory(library.fullpath, library.relativePath, readArtist);

}

// Synchronises the music on disk with the database.
function syncMusic (db, library) {

	return db.query('SELECT path, id FROM songs').then((storedSongs) => {

		let currentSongs = {};

		storedSongs.forEach((song) => {
			currentSongs[song.path] = song.id;
		});

		diffMusic(db, library, currentSongs).then((artists) => {
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

	});

}


// ----- Exports ----- //

module.exports = function scan (dbFile, musicDir) {

	let db = Db(dbFile);
	db.connect();

	db.query('SELECT * FROM libraries').then((libraries) => {

		let syncLibraries = [];

		for (let library of libraries) {

			let libraryPath = {
				relativePath: library.id.toString(),
				fullpath: path.join(musicDir, library.id.toString())
			};

			syncLibraries.push(syncMusic(db, libraryPath));

		}

		return Promise.all(syncLibraries);

	}).then(() => {
		db.close();
	}).catch((err) => {

		console.log(err);
		db.close();

	});

};
