'use strict';

// ----- Requires ----- //

let sqlite3 = require('sqlite3').verbose();
let fs = require('fs');


// ----- Exports ----- //

module.exports = function Db (dbFile) {

	// ----- Properties ----- //

	let db = null;


	// ----- Functions ----- //

	// Connects to the database.
	function connectDb () {
		db = new sqlite3.Database(dbFile);
	}

	// Closes the database connection.
	function closeDb () {

		db.close();
		db = null;

	}

	// Creates the database from the schema.
	function initDb (dbSchema) {

		return new Promise((res, rej) => {

			if (!db) {
				rej('Database not open.');
			}

			fs.readFile(dbSchema, 'utf8', (err, data) => {

				if (err) {
					rej(err);
				}

				db.exec(data, (err) => {

					if (err) {
						rej(err);
					} else {
						res();
					}

				});

			});

		});

	}

	// General-purpose function for querying the database.
	function dbQuery (sql, params) {

		return new Promise((res, rej) => {

			if (!db) {
				rej('Database not open.');
			}

			db.all(sql, params, result);

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

			if (!db) {
				rej('Database not open.');
			}

			db.run(sql, params, handle);

			function handle (err) {

				if (err) {
					rej(err);
				} else {
					res(this.lastID);
				}

			}

		});

	}

	// Runs multiple queries.
	function dbMany (sql, params) {

		return new Promise((res, rej) => {

			if (!db) {
				rej('Database not open.');
			}

			let counter = 0;

			for (let paramset of params) {
				db.run(sql, paramset, handle);
			}

			function handle (err) {

				if (err) {
					rej(err);
				}

				counter++;

				if (counter === params.length) {
					res();
				}

			}

		});

	}

	// ----- Interface ----- //

	return {
		connect: connectDb,
		close: closeDb,
		init: initDb,
		query: dbQuery,
		insert: dbInsert,
		many: dbMany
	};

};
