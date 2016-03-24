'use strict';

// ----- Requires ----- //

let fs = require('fs');
let path = require('path');
let express = require('express');
let sqlite3 = require('sqlite3').verbose();
let bodyParser = require('body-parser');

let scan = require('./scan');


// ----- Setup ----- //

// Sqlite database.
let DB_SCHEMA = 'schema.sql';
let DB_FILE = 'music.db';

// Sets up app.
let app = express();

// Static files and POSTed forms.
app.use('/static', express.static('static'));
app.use(bodyParser.urlencoded({ extended: false }));


// ----- Functions ----- //

// Connects to the database and runs an operation on it.
function connectDb (operation) {

	let db = new sqlite3.Database(DB_FILE);

	db.serialize(operation(db));
	db.close();

}

// Creates the database from the schema.
function initDb () {

	return new Promise((res, rej) => {

		fs.readFile(DB_SCHEMA, 'utf8', (err, data) => {

			connectDb(buildSchema);

			function buildSchema (db) {
				return () => { db.exec(data, res); };
			}

		});

	});

}

// General-purpose function for querying the database.
function dbQuery (sql, params) {

	return new Promise((res, rej) => {

		connectDb(runQuery);

		function runQuery (db) {
			return () => { db.all(sql, params, result); };
		}

		function result (err, rows) {

			if (err) {
				rej(err);
			} else {
				res(rows);
			}

		}

	});

}

// Runs an insert query and resolves with the row id.
function dbInsert (sql, params) {

	return new Promise((res, rej) => {

		connectDb(runQuery);

		function runQuery (db) {
			return () => { db.run(sql, params, handle); };
		}

		function handle (err) {

			if (err) {
				rej(err);
			} else {
				res(this.lastID);
			}

		}

	});

}


// ----- Routes ----- //

// Returns the main app page.
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/app.html');
});

// Returns a copy of the full database as JSON.
app.get('/db', (req, res) => {

	let queries = [
		dbQuery('SELECT * FROM songs'),
		dbQuery('SELECT * FROM artists'),
		dbQuery('SELECT * FROM albums')
	];

	Promise.all(queries).then((results) => {

		res.send({songs: results[0], artists: results[1], albums: results[2]});

	});

});

// Returns the info for a single song as JSON.
app.get('/db/:songId', (req, res) => {

	let id = req.params.songId;

	dbQuery('SELECT * FROM songs WHERE id = ?', id).then((info) => {

		if (info[0]) {
			res.send(info[0]);
		} else {
			res.sendStatus(404);
		}		

	});

});

// Adds a music library and path.
app.post('/add_library', (req, res) => {

	let libraryPath = req.body.library_path;
	let name = req.body.name;

	fs.stat(libraryPath, (err, stats) => {

		if (!err && stats.isDirectory()) {

			let query = 'INSERT INTO libraries (name, path) VALUES (?, ?)';

			dbInsert(query, [name, libraryPath]).then((rowId) => {

				let symlinkPath = path.join(__dirname, 'static/music', rowId.toString());
				fs.symlink(libraryPath, symlinkPath, (err) => {
					res.sendStatus(err ? 500 : 201);
				});

				

			});

		} else {
			res.status(400).send('No such path on the file system.');
		}

	});

});


// ----- Run ----- //

initDb().then(() => {

	app.listen(3000, () => {
		console.log('Running on 3000...');
	});

});
