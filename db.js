'use strict';

// ----- Requires ----- //

let sqlite3 = require('sqlite3').verbose();
let fs = require('fs');


// ----- Exports ----- //

module.exports = function Db (dbFile) {

	// ----- Functions ----- //

	// Connects to the database and runs an operation on it.
	function connectDb (operation) {

		let db = new sqlite3.Database(dbFile);

		db.serialize(operation(db));
		db.close();

	}

	// Creates the database from the schema.
	function initDb (dbSchema) {

		return new Promise((res, rej) => {

			fs.readFile(dbSchema, 'utf8', (err, data) => {

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

	// ----- Interface ----- //

	return {
		init: initDb,
		query: dbQuery,
		insert: dbInsert
	};

};
