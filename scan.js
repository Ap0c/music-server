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

// Builds a list of albums for a particular artist.
function readAlbums (artistPath) {

	return new Promise((res, rej) => {

		fs.readdir(artistPath, (err, files) => {

			if (err) {
				rej(err);
			}

			let getAlbums = files.map((file) => {
				return getAlbum(artistPath, file);
			});

			Promise.all(getAlbums).then((albums) => {
				res(albums.filter((album) => { return album; }));
			});

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

				readAlbums(artistPath).then((albums) => {

					artist.albums = albums;
					res(artist);

				});

			} else {
				res(null);
			}

		});

	});

}

// Builds a list of artists and their corresponding albums.
function readArtists (library) {

	return new Promise((res, rej) => {

		fs.readdir(library.path, (err, files) => {

			if (err) {
				rej(err);
			}

			let getArtists = files.map((file) => {
				return getArtist(library.path, file);
			});

			Promise.all(getArtists).then((artists) => {
				res(artists.filter((artist) => { return artist; }));
			});

		});

	});

}

function diffMusic (db, library, currentSongs) {

	return new Promise((res, rej) => {

		let toAdd = [];

		readArtists(library).then(res);

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
