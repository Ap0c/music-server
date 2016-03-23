'use strict';

// ----- Requires ----- //

let express = require('express');
let sqlite3 = require('sqlite3').verbose();


// ----- Setup ----- //

// Sqlite database.
let DB_FILE = 'music.db';

let app = express();
app.use('/static', express.static('static'));


// ----- Functions ----- //

// General-purpose function for querying the database.
function dbQuery (sql, params) {

	return new Promise((res, rej) => {

		let db = new sqlite3.Database(DB_FILE);
		let result = null;

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


// ----- Run ----- //

app.listen(3000, () => {
	console.log('Running on 3000...');
});
