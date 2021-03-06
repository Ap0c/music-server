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
		});

	});

}

// Resolves with an song object, or null if song is invalid.
function readSongs (albumPath, filename) {

	let songPath = {
		full: path.join(albumPath.full, filename),
		relative: path.join(albumPath.relative, filename)
	};

	return isDir(songPath.full).then((invalidSong) => {

		if (invalidSong) {
			return null;
		}

		let songName = path.parse(filename).name;
		let leadingNumber = parseInt(songName.split(' ')[0]);
		let number = null;

		if (!isNaN(leadingNumber)) {
			number = leadingNumber;
			songName = songName.substr(songName.indexOf(' ') + 1);
		}

		return { name: songName, path: songPath.relative, number: number };

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
function mapDirs (items, keyProperty, valueProperty) {

	let newItems = {};

	for (let item of items) {
		newItems[item[keyProperty]] = item[valueProperty];
	}

	return newItems;

}

// Retrieves the items currently stored in the database for the library.
function oldLibrary (db, id) {

	let getOld = [
		db.query('SELECT dirname, id FROM artists WHERE library = ?', id),
		db.query('SELECT dirname, id FROM albums WHERE library = ?', id),
		db.query('SELECT path, id FROM songs WHERE library = ?', id)
	];

	return Promise.all(getOld).then((oldItems) => {

		let artists = mapDirs(oldItems[0], 'dirname', 'id');
		let albums = mapDirs(oldItems[1], 'dirname', 'id');
		let songs = mapDirs(oldItems[2], 'path', 'id');

		return { artists: artists, albums: albums, songs: songs };

	});

}

// Adds a song to the database.
function syncSong (db, song, oldItems, libraryId, artistId, albumId) {

	let id = oldItems.songs[song.path];

	if (id) {

		delete oldItems.songs[song.path];
		return Promise.resolve(id);

	} else {

		let query = `INSERT INTO songs
			(name, number, artist, album, path, library)
			VALUES (?, ?, ?, ?, ?, ?)`;
		let params = [song.name, song.number, artistId, albumId, song.path,
			libraryId];

		return db.insert(query, params);

	}

}

// Adds an album's songs to the database.
function syncSongs (db, songs, oldItems, libraryId, artistId, albumId) {

	let additions = [];

	for (let song of songs) {

		additions.push(syncSong(db, song, oldItems, libraryId, artistId,
			albumId));

	}

	return Promise.all(additions);

}

// Adds an album to the database.
function syncAlbum (db, album, oldItems, libraryId, artistId) {

	let id = oldItems.albums[album.dirname];

	if (id) {

		delete oldItems.albums[album.dirname];
		return syncSongs(db, album.songs, oldItems, libraryId, artistId, id);

	} else {

		let query = `INSERT INTO albums (name, artist, dirname, library)
			VALUES (?, ?, ?, ?)`;
		let params = [album.name, artistId, album.dirname, libraryId];

		return db.insert(query, params).then((rowId) => {
			return syncSongs(db, album.songs, oldItems, libraryId, artistId,
				rowId);
		});

	}

}

// Adds an artist's albums to the database.
function syncAlbums (db, albums, oldItems, libraryId, artistId) {

	let additions = [];

	for (let album of albums) {
		additions.push(syncAlbum(db, album, oldItems, libraryId, artistId));
	}

	return Promise.all(additions);

}

// Adds an artist to the database.
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

// Deletes all artists that are no longer on disk from the database.
function deleteItems (db, toDelete) {

	let deleteArtists = Object.keys(toDelete.artists).map((artist) => {
		return toDelete.artists[artist];
	});

	let deleteAlbums = Object.keys(toDelete.albums).map((album) => {
		return toDelete.albums[album];
	});

	let deleteSongs = Object.keys(toDelete.songs).map((song) => {
		return toDelete.songs[song];
	});

	let deletions = [
		db.many('DELETE FROM artists WHERE id = ?', deleteArtists),
		db.many('DELETE FROM albums WHERE id = ?', deleteAlbums),
		db.many('DELETE FROM songs WHERE id = ?', deleteSongs)
	];

	return Promise.all(deletions);

}

// Adds all artists on disk to the database.
function addItems (db, database, disk, libraryId) {

	let additions = [];

	for (let artist of disk) {
		additions.push(syncArtist(db, artist, database, libraryId));
	}

	return Promise.all(additions);

}

// Synchronises the music on disk with the database.
function syncLibrary (db, library, id) {

	let diskAndDatabase = [
		oldLibrary(db, id),
		readDirectory(library, readArtist)
	];

	return Promise.all(diskAndDatabase).then((oldAndNew) => {

		let database = oldAndNew[0];
		let disk = oldAndNew[1];

		return addItems(db, database, disk, id).then(() => {
			return deleteItems(db, database);
		});

	});

}


// ----- Exports ----- //

module.exports = function scan (dbFile, musicDir) {

	let db = Db(dbFile);
	db.connect();

	return db.query('SELECT * FROM libraries').then((libraries) => {

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
		throw new Error(`Scan failed: ${err}.`);

	});

};
