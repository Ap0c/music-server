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

// Static files, templates and POSTed forms.
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
function insertLibrary (db, res, name, libraryPath) {

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
			return insertLibrary(db, res, name, libraryPath);
		} else {
			res.sendStatus(409);
		}

	});

}

// Gets the type for a name retrieval query.
function nameType (type) {

	if (['artists', 'albums', 'songs'].indexOf(type) > -1) {
		return 'library';
	} else {
		return type;
	}

}

// Retrieves the name of a given library, album or artist.
function getName (db, res, type, id) {

	let queryType = nameType(type);

	let queries = {
		library: 'SELECT name FROM libraries WHERE id = ?',
		artist: 'SELECT name FROM artists WHERE id = ?',
		album: 'SELECT name FROM albums WHERE id = ?'
	};

	return db.query(queries[queryType], id).then((result) => {

		if (result.length === 0) {

			res.sendStatus(404);
			return null;

		} else {
			return result[0].name;
		}

	});

}

// Gets the view title, or returns null if the view does not exist.
function getTitle (db, res, type, id) {

	let libraryTitles = {
		artists: 'Artists',
		albums: 'Albums',
		songs: 'Songs'
	};

	return getName(db, res, type, id).then((name) => {

		if (!name || ['artists', 'albums', 'songs'].indexOf(type) === -1) {
			return name;
		} else {
			return `${name} - ${libraryTitles[type]}`;
		}

	});

}

// Retrieves a list and renders the view.
function listView (db, res, type, id) {

	db.connect();

	let queries = {
		artists: 'SELECT id, name FROM artists WHERE library = ?',
		albums: 'SELECT id, name FROM albums WHERE library = ?',
		songs: 'SELECT id, name FROM songs WHERE library = ?',
		artist: 'SELECT name FROM albums WHERE artist = ?',
		album: 'SELECT name FROM songs WHERE album = ?'
	};

	res.promise(getTitle(db, res, type, id).then((title) => {

		if (title) {

			return db.query(queries[type], id).then((list) => {
				res.render('app', { title: title, list: list });
			});

		}

	}));

}


// ----- Routes ----- //

// Returns the main app page.
app.get('/', (req, res) => {
	res.render('app');
});

// Lists the artists in a library.
app.get('/library/:id', (req, res) => {
	listView(db, res, 'artists', req.params.id);
});

// Lists the songs in a library.
app.get('/library/:id/songs', (req, res) => {
	listView(db, res, 'songs', req.params.id);
});

// Lists the albums in a library.
app.get('/library/:id/albums', (req, res) => {
	listView(db, res, 'albums', req.params.id);
});

app.get('/artist/:id', (req, res) => {
	listView(db, res, 'artist', req.params.id);
});

app.get('/album/:id', (req, res) => {
	listView(db, res, 'album', req.params.id);
});

// Returns a copy of the full database as JSON.
app.get('/db', (req, res) => {

	db.connect();

	let queries = [
		db.query('SELECT * FROM songs'),
		db.query('SELECT * FROM artists'),
		db.query('SELECT * FROM albums')
	];

	res.promise(Promise.all(queries).then((results) => {
		res.send({songs: results[0], artists: results[1], albums: results[2]});
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
