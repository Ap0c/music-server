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
function readDirectory (dirPath, getInfo) {

	return listDir(dirPath.full).then((files) => {

		let info = files.map((file) => {
			return getInfo(dirPath, file);
		});

		return Promise.all(info).then((metadata) => {
			return metadata.filter((datum) => { return datum; });
		}).catch((err) => {
			console.log(err);
		});

	});

}

// Resolves with an song object, or null if song is invalid.
function readSongs (albumPath, filename) {

	let songPath = path.join(albumPath.full, filename);

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

	let albumPath = {
		full: path.join(artistPath.full, albumDir),
		relative: path.join(artistPath.relative, albumDir)
	};

	return isDir(albumPath.full).then((validAlbum) => {

		if (!validAlbum) {
			return null;
		}

		return readDirectory(albumPath, readSongs).then((songs) => {

			return {
				name: albumDir,
				dirname: albumPath.relative,
				songs: songs
			};

		});

	});

}

// Resolves with an artist object, or null if artist is invalid.
function readArtist (libraryPath, artistDir) {

	let artistPath = {
		full: path.join(libraryPath.full, artistDir),
		relative: path.join(libraryPath.relative, artistDir)
	};

	return isDir(artistPath.full).then((validArtist) => {

		if (!validArtist) {
			return null;
		}

		return readDirectory(artistPath, readAlbum).then((albums) => {

			return {
				name: artistDir,
				dirname: artistPath.relative,
				albums: albums
			};

		});

	});

}

// Retrieves the id of an artist, adding it to database where necessary.
function getArtist (db, artist) {

	return db.query('SELECT id FROM artists WHERE dirname = ?',
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

// Helper function to remap retrieved row information.
function remapRow (item, key, value) {

	let newItem = {};
	newItem[key] = value;

	return newItem;

}

// Retrieves the items currently stored in the database for the library.
function oldLibrary (db, id) {

	let getOld = [
		db.query('SELECT dirname, id FROM artists WHERE library = ?', id),
		db.query('SELECT dirname, id FROM albums WHERE library = ?', id),
		db.query('SELECT path, id FROM songs WHERE library = ?', id)
	];

	return Promise.all(getOld).then((oldItems) => {

		let artists = oldItems[0].map((artist) => {
			return remapRow(artist, artist.dirname, artist.id);
		});

		let albums = oldItems[1].map((album) => {
			return remapRow(album, album.dirname, album.id);
		});

		let songs = oldItems[1].map((song) => {
			return remapRow(song, song.path, song.id);
		});

		return { artists: artists, albums: albums, songs: songs };

	});

}


function syncAlbums (db, albums, oldItems, libraryId, artistId) {



}

function syncArtist (db, artist, oldItems, libraryId) {

	let id = oldItems.artists[artist.dirname];

	if (id) {

		delete oldItems.artists[artist.dirname];
		return syncAlbums(db, artist.albums, oldItems, libraryId, id);

	} else {

		let query = `INSERT INTO artists (name, dirname, library)
			VALUES (?, ?, ?)`;
		let params = [artist.name, artist.dirname, libraryId];

		return db.insert(query, params).then((rowId) => {
			return syncAlbums(db, artist.albums, oldItems, libraryId, rowId);
		});

	}

}

// Synchronises the music on disk with the database.
function syncLibrary (db, library, id) {

	let diskAndDatabase = [
		oldLibrary(db, id),
		readDirectory(library, readArtist)
	];

	Promise.all(diskAndDatabase).then((oldAndNew) => {

		let database = oldAndNew[0];
		let disk = oldAndNew[1];

		for (let artist of disk) {
			syncArtist(db, artist, database, id);
		}

	}).catch((err) => {
		console.log(err);
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
				relative: library.id.toString(),
				full: path.join(musicDir, library.id.toString())
			};

			syncLibraries.push(syncLibrary(db, libraryPath, library.id));

		}

		return Promise.all(syncLibraries);

	}).then(() => {
		db.close();
	}).catch((err) => {

		console.log(err);
		db.close();

	});

};
