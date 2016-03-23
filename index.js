'use strict';

// ----- Requires ----- //

let fs = require('fs');
let express = require('express');
let sqlite3 = require('sqlite3').verbose();


// ----- Setup ----- //

// Sqlite database.
let DB_SCHEMA = 'schema.sql';
let DB_FILE = 'music.db';

let app = express();
app.use('/static', express.static('static'));


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

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/app.html');
});

app.get('/db', (req, res) => {
	res.send('Database result');
});

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
