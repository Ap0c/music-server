'use strict';

// ----- Requires ----- //

let fs = require('fs');
let path = require('path');
let express = require('express');
let bodyParser = require('body-parser');

let Db = require('./db');
let scan = require('./scan');


// ----- Setup ----- //

// Sqlite database.
let DB_SCHEMA = 'schema.sql';
let DB_FILE = 'music.db';

// Music location.
let MUSIC_DIR = 'static/music';

// Sets up app and db.
let app = express();
let db = Db(DB_FILE);

// Static files and POSTed forms.
app.use('/static', express.static('static'));
app.use(bodyParser.urlencoded({ extended: false }));


// ----- Functions ----- //

// Inserts the library into the database.
function insertLibrary (db, res, name, libraryPath) {

	let query = 'INSERT INTO libraries (name, path) VALUES (?, ?)';

	return db.insert(query, [name, libraryPath]).then((id) => {
		createSymlink(libraryPath, id);
	}).then(() => {

		res.sendStatus(201);
		db.close();

	});

}

// Creates a symlink to the library in the music directory.
function createSymlink (libraryPath, id) {

	return new Promise((res, rej) => {

		let symlinkPath = path.join(__dirname, MUSIC_DIR, id.toString());

		fs.symlink(libraryPath, symlinkPath, (err) => {

			if (err) {
				rej(err);
			} else {
				res();
			}

		});

	});

}

// Adds library to the database and creates symlink to music.
function addLibrary (res, name, libraryPath) {

	db.connect();

	let query = 'SELECT * FROM libraries WHERE path = ?';

	db.query(query, libraryPath).then((result) => {

		if (result.length === 0) {
			return insertLibrary(db, res, name, libraryPath);
		} else {
			res.sendStatus(409);
		}

	}).catch((err) => {

		res.sendStatus(500);
		db.close();

	});

}


// ----- Routes ----- //

// Returns the main app page.
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/app.html');
});

// Returns a copy of the full database as JSON.
app.get('/db', (req, res) => {

	db.connect();

	let queries = [
		db.query('SELECT * FROM songs'),
		db.query('SELECT * FROM artists'),
		db.query('SELECT * FROM albums')
	];

	Promise.all(queries).then((results) => {

		res.send({songs: results[0], artists: results[1], albums: results[2]});
		db.close();

	}).catch((err) => {

		res.sendStatus(500);
		db.close();

	});

});

// Returns the info for a single song as JSON.
app.get('/db/:songId', (req, res) => {

	let id = req.params.songId;
	db.connect();

	db.query('SELECT * FROM songs WHERE id = ?', id).then((info) => {

		if (info[0]) {
			res.send(info[0]);
		} else {
			res.sendStatus(404);
		}

		db.close();

	}).catch((err) => {

		res.sendStatus(500);
		db.close();

	});

});

// Adds a music library and path.
app.post('/add_library', (req, res) => {

	let libraryPath = req.body.library_path;
	let name = req.body.name;

	fs.stat(libraryPath, (err, stats) => {

		if (!err && stats.isDirectory()) {
			addLibrary(res, name, libraryPath);
		} else {
			res.status(400).send('No such path on the file system.');
		}

	});

});


// ----- Run ----- //

db.connect();

db.init(DB_SCHEMA).then(() => {

	db.close();

	app.listen(3000, () => {
		console.log('Running on 3000...');
	});

}).catch((err) => {
	console.log(err);
});
