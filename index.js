'use strict';

// ----- Requires ----- //

let fs = require('fs');
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

// Creates the database from the schema.
function initDb () {

	return new Promise((res, rej) => {

		fs.readFile(DB_SCHEMA, 'utf8', (err, data) => {

			let db = new sqlite3.Database(DB_FILE);
			db.serialize(buildSchema);

			function buildSchema () {
				db.exec(data, res);
			}

			db.close();

		});

	});

}

// General-purpose function for querying the database.
function dbQuery (sql, params) {

	return new Promise((res, rej) => {

		let db = new sqlite3.Database(DB_FILE);
		db.serialize(runQuery);

		function runQuery () {
			db.all(sql, params, handle);
		}

		function handle (err, rows) {
			res(rows);
		}

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


// ----- Run ----- //

initDb().then(() => {

	app.listen(3000, () => {
		console.log('Running on 3000...');
	});

});
