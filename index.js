'use strict';

// ----- Requires ----- //

let fs = require('fs');
let path = require('path');
let express = require('express');
let bodyParser = require('body-parser');
let pug = require('pug');

let Db = require('./db');
let scan = require('./scan');
let views = require('./views');


// ----- Setup ----- //

// Sqlite database.
const DB_SCHEMA = 'schema.sql';
const DB_FILE = 'music.db';

// Music location.
const MUSIC_DIR = 'static/music';

// Sets up app and db.
let app = express();
let db = Db(DB_FILE);

// Middleware.
app.use('/static', express.static('static'));
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(promiseResponse);
app.use(errHandle);


// ----- Functions ----- //

// Promisifies responses.
function promiseResponse (req, res, next) {

	res.promise = (promise) => {

		promise.then(() => {
			if (db.open) db.close();
		}).catch((err) => {

			res.sendStatus(500);
			if (db.open) db.close();
			console.log(err);

		});

	};

	next();

}

// Catches unexpected errors.
function errHandle (err, req, res, next) {

	res.sendStatus(500);
	console.log(err);

}

// Inserts the library into the database.
function insertLibrary (res, name, libraryPath) {

	let query = 'INSERT INTO libraries (name, path) VALUES (?, ?)';

	return db.insert(query, [name, libraryPath]).then((id) => {
		createSymlink(libraryPath, id);
	}).then(() => {
		res.sendStatus(201);
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

	return db.query(query, libraryPath).then((result) => {

		if (result.length === 0) {
			return insertLibrary(res, name, libraryPath);
		} else {
			res.sendStatus(409);
		}

	});

}


// ----- Routes ----- //

// Returns the main app page.
app.get('/', (req, res) => {

	db.connect();

	res.promise(db.query('SELECT id, name FROM libraries').then((libraries) => {

		res.render('app', {

			title: 'Music - Libraries',
			list: libraries,
			view: 'libraries',
			url: (id) => {
				return `/library/${id}`;
			}

		});

	}));

});

// Lists the artists in a library.
app.get('/library/:id', (req, res) => {

	views.list('artists', req.params.id, db, res, (id) => {
		return `/artist/${id}`;
	});

});

// Lists the songs in a library.
app.get('/library/:id/songs', (req, res) => {
	views.list('songs', req.params.id, db, res);
});

// Lists the albums in a library.
app.get('/library/:id/albums', (req, res) => {

	views.list('albums', req.params.id, db, res, (id) => {
		return `/album/${id}`;
	});

});

// Lists the albums for an artist.
app.get('/artist/:id', (req, res) => {

	views.list('artist', req.params.id, db, res, (id) => {
		return `/album/${id}`;
	});

});

// Lists the songs for an album.
app.get('/album/:id', (req, res) => {
	views.list('album', req.params.id, db, res);
});

// Returns a copy of the full database as JSON.
app.get('/db', (req, res) => {

	db.connect();

	let queries = [
		db.query('SELECT * FROM songs'),
		db.query('SELECT * FROM artists'),
		db.query('SELECT * FROM albums'),
		db.query('SELECT * FROM libraries')
	];

	res.promise(Promise.all(queries).then((results) => {
		res.send({
			songs: results[0],
			artists: results[1],
			albums: results[2],
			libraries: results[3]
		});
	}));

});

// Returns the info for a single song as JSON.
app.get('/db/:songId', (req, res) => {

	let id = req.params.songId;
	db.connect();

	let query = 'SELECT * FROM songs WHERE id = ?';

	res.promise(db.query(query, id).then((info) => {

		if (info[0]) {
			res.send(info[0]);
		} else {
			res.sendStatus(404);
		}

	}));

});

// Adds a music library and path.
app.post('/add_library', (req, res) => {

	let libraryPath = req.body.library_path;
	let name = req.body.name;

	fs.stat(libraryPath, (err, stats) => {

		if (!err && stats.isDirectory()) {
			res.promise(addLibrary(res, name, libraryPath));
		} else {
			res.status(400).send('No such path on the file system.');
		}

	});

});

// Retrieves the database version.
app.get('/db_version', (req, res) => {

	db.connect();

	res.promise(db.query('SELECT * FROM db_version').then((version) => {
		res.send(version[0]);
	}));

});


// ----- Run ----- //

db.connect();

db.init(DB_SCHEMA).then(() => {

	db.close();

	let template = pug.compileFileClient('views/list.pug', {name: 'listTemplate'});

	fs.writeFile('static/template.js', template, (err) => {

		if (err) {
			throw new Error(err);
		}

		app.listen(3000, () => {
			console.log('Running on 3000...');
		});

	});

}).catch((err) => {
	console.log(err);
});
