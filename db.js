'use strict';

// ----- Requires ----- //

let sqlite3 = require('sqlite3').verbose();
let fs = require('fs');


// ----- Exports ----- //

module.exports = function Db (dbFile) {

	// ----- Properties ----- //

	let db = null;

	// ----- Promise Wrapper ----- //

	// Wrapper for promisifications and checking db connection is open.
	function wrap (fn) {

		return function wrapper () {

			return new Promise((res, rej) => {

				if (!db) {
					rej('Database not open.');
				}

				fn(res, rej, ...arguments);

			});

		};

	}

	// ----- Functions ----- //

	// Connects to the database.
	let connectDb = () => {
		db = new sqlite3.Database(dbFile);
	};

	// Closes the database connection.
	let closeDb = () => {

		db.close();
		db = null;

	};

	// Creates the database from the schema.
	let initDb = wrap((res, rej, dbSchema) => {

		fs.readFile(dbSchema, 'utf8', (err, data) => {

			if (err) {
				rej(err);
			} else {

				db.exec(data, (err) => {
					err ? rej(err) : res();
				});

			}

		});

	});

	// General-purpose function for querying the database.
	let dbQuery = wrap((res, rej, sql, params) => {

		db.all(sql, params, handle);

		function handle (err, rows) {
			err ? rej(err) : res(rows);
		}

	});

	// Runs an insert query and resolves with the row id.
	let dbInsert = wrap((res, rej, sql, params) => {

		db.run(sql, params, handle);

		function handle (err) {
			err ? rej(err) : res(this.lastID);
		}

	});

	// Runs multiple queries.
	let dbMany = wrap((res, rej, sql, params) => {

		let counter = 0;

		for (let paramset of params) {
			db.run(sql, paramset, handle);
		}

		function handle (err) {

			if (err) {
				rej(err);
			} else {

				counter++;

				if (counter === params.length) {
					res();
				}

			}

		}

	});

	// ----- Interface ----- //

	return {
		connect: connectDb,
		close: closeDb,
		init: initDb,
		query: dbQuery,
		insert: dbInsert,
		many: dbMany,
		get open () {
			if (db) {
				return true;
			} else {
				return false;
			}
		}
	};

};
