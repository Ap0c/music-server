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

// Retrieves a list and renders the view.
function listView (view, id, db, res, urlCallback) {

	db.connect();

	res.promise(getTitle(db, res, view, id).then((title) => {

		if (title) {

			return db.query(LIST_QUERIES[view], id).then((list) => {

				res.render('app', {
					title: title,
					list: list,
					view: view,
					url: urlCallback
				});

			});

		}

	}));

}


// ----- Exports ----- //

module.exports = {
	list: listView
};
