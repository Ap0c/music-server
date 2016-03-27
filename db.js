'use strict';

// ----- Requires ----- //

let sqlite3 = require('sqlite3').verbose();
let fs = require('fs');


// ----- Exports ----- //

module.exports = function Db (dbFile) {

	// ----- Properties ----- //

	let db = null;
	let changesMade = false;

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

	// Updates the database version.
	let bumpVersion = wrap((res, rej) => {

		if (changesMade) {
			res();
		} else {
			db.run('UPDATE db_version SET version = version + ?', 1, handle);
		}

		function handle (err) {

			if (err) {
				rej(err);
			} else {

				changesMade = true;
				res();

			}

		}

	});

	// Initialises the database version.
	function initVersion (res, rej) {

		return dbQuery('SELECT version FROM db_version').then((version) => {

			if (version.length === 0) {

				let query = 'INSERT INTO db_version VALUES (?)';

				db.run(query, 1, (err) => {

					if (err) {
						rej(err);
					} else {
						res();
					}

				});

			} else {
				res();
			}

		}).catch((err) => {
			rej(err);
		});

	}

	// Connects to the database.
	let connectDb = () => {
		db = new sqlite3.Database(dbFile);
	};

	// Closes the database connection.
	let closeDb = () => {

		db.close();
		db = null;
		changesMade = false;

	};

	// Creates the database from the schema.
	let initDb = wrap((res, rej, dbSchema) => {

		fs.readFile(dbSchema, 'utf8', (err, data) => {

			if (err) {
				rej(err);
			} else {

				db.exec(data, (err) => {

					if (err) {
						rej(err);
					} else {
						initVersion(res, rej);
					}

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

			if (err) {
				rej(err);
			} else {

				bumpVersion().then(() => {
					res(this.lastID);
				}).catch((err) => {
					rej(err);
				});

			}

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

				bumpVersion().then(() => {

					counter++;

					if (counter === params.length) {
						res();
					}

				}).catch((err) => {
					rej(err);
				});

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
