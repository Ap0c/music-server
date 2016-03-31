'use strict';

// ----- Setup ----- //

// Queries.
const LIST_QUERIES = {
	artists: 'SELECT id, name FROM artists WHERE library = ? ORDER BY name',
	albums: 'SELECT id, name FROM albums WHERE library = ? ORDER BY name',
	songs: 'SELECT id, name FROM songs WHERE library = ? ORDER BY name',
	artist: 'SELECT id, name FROM albums WHERE artist = ? ORDER BY name',
	album: 'SELECT id, name FROM songs WHERE album = ? ORDER BY number'
};

const NAME_QUERIES = {
	library: 'SELECT name FROM libraries WHERE id = ?',
	artist: 'SELECT name FROM artists WHERE id = ?',
	album: 'SELECT name FROM albums WHERE id = ?'
};

const LIBRARY_TITLES = {
	artists: 'Artists',
	albums: 'Albums',
	songs: 'Songs'
};


// ----- Functions ----- //

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

	return db.query(NAME_QUERIES[queryType], id).then((result) => {

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

	return getName(db, res, type, id).then((name) => {

		if (!name || ['artists', 'albums', 'songs'].indexOf(type) === -1) {
			return name;
		} else {
			return `${name} - ${LIBRARY_TITLES[type]}`;
		}

	});

}

// Retrieves the id of a library based on a specific view.
function getLibrary (view, id, db) {

	let query = '';

	if (['artists', 'albums', 'songs'].indexOf(view) != -1) {
		return Promise.resolve(id);
	} else if (view === 'artist') {
		query = 'SELECT library FROM artists WHERE id = ?';
	} else if (view === 'album') {
		query = 'SELECT library FROM albums WHERE id = ?';
	}

	return db.query(query, id).then((result) => {
		return result[0].library;
	});

}

// Retrieves a list and renders the view.
function listView (view, id, db, res, urlCallback) {

	db.connect();

	res.promise(() => {

		let getData = [
			getTitle(db, res, view, id),
			db.query(LIST_QUERIES[view], id),
			getLibrary(view, id, db)
		];

		return Promise.all(getData).then((data) => {

			let title = data[0];
			let list = data[1];
			let library = data[2];
			console.log(library);

			if (title) {

				res.render('app', {
					title: title,
					list: list,
					view: view,
					url: urlCallback,
					library: library
				});

			}

		});

	}());

}


// ----- Exports ----- //

module.exports = {
	list: listView
};
