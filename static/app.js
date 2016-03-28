// ----- Setup ----- //

var clientRouting = false;


// ----- Modules ----- //

var Db = (function Database () {

	// ----- Properties ----- //

	var db = null;
	var exports = {};


	// ----- Functions ----- //

	// Sets up the database schema.
	function build () {

		var schemaBuilder = lf.schema.create('music', 1);

		schemaBuilder.createTable('Artists')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addColumn('library', lf.Type.INTEGER)
			.addPrimaryKey(['id']);

		schemaBuilder.createTable('Albums')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addColumn('artist', lf.Type.INTEGER)
			.addColumn('library', lf.Type.INTEGER)
			.addPrimaryKey(['id']);

		schemaBuilder.createTable('Songs')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addColumn('number', lf.Type.INTEGER)
			.addColumn('artist', lf.Type.INTEGER)
			.addColumn('album', lf.Type.INTEGER)
			.addColumn('path', lf.Type.STRING)
			.addColumn('library', lf.Type.INTEGER)
			.addPrimaryKey(['id'])
			.addNullable(['number']);

		schemaBuilder.createTable('Libraries')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('name', lf.Type.STRING)
			.addPrimaryKey(['id']);

		schemaBuilder.createTable('DataVersion')
			.addColumn('id', lf.Type.INTEGER)
			.addColumn('version', lf.Type.INTEGER)
			.addPrimaryKey(['id']);

		return schemaBuilder;

	}

	// Sets up the database connect, saves in 'db' property.
	function connect (schemaBuilder) {

		return schemaBuilder.connect().then(function (conn) {
			db = conn;
		});

	}

	// Refreshes the dataset from the server.
	function retrieveData () {

		var artists = db.getSchema().table('Artists');
		var albums = db.getSchema().table('Albums');
		var songs = db.getSchema().table('Songs');
		var libraries = db.getSchema().table('Libraries');

		var data = null;

		return db.delete().from(artists).exec().then(function () {
			return db.delete().from(albums).exec();
		}).then(function () {
			return db.delete().from(songs).exec();
		}).then(function () {
			return db.delete().from(libraries).exec();
		}).then(function () {
			return fetch('http://localhost:3000/db');
		}).then(function (res) {
			return res.json();
		}).then(function (res) {

			data = res;

			var rows = data.artists.map(function (artist) {
				return artists.createRow(artist);
			});

			return db.insert().into(artists).values(rows).exec();

		}).then(function () {

			var rows = data.albums.map(function (album) {
				return albums.createRow(album);
			});

			return db.insert().into(albums).values(rows).exec();

		}).then(function () {

			var rows = data.songs.map(function (song) {
				return songs.createRow(song);
			});

			return db.insert().into(songs).values(rows).exec();

		}).then(function () {

			var rows = data.libraries.map(function (library) {
				return libraries.createRow(library);
			});

			return db.insert().into(libraries).values(rows).exec();

		});

	}

	// Updates the data version locally.
	function updateVersion (version, table) {

		return retrieveData().then(function () {

			var row = table.createRow({ id: 1, version: version });

			return db.insertOrReplace().into(table).values([row]).exec();

		});

	}

	// Synchronises the database contents with the backend.
	function syncData () {

		var dataVersion = null;
		var versionTable = null;

		return fetch('http://localhost:3000/db_version').then(function (res) {
			return res.json();
		}).then(function (version) {
			dataVersion = version.version;
		}).then(function () {

			versionTable = db.getSchema().table('DataVersion');
			return db.select().from(versionTable).exec();

		}).then(function (rows) {

			if (rows.length === 0 || rows[0].version < dataVersion) {
				return updateVersion(dataVersion, versionTable);
			}

		});

	}

	// Gets all items from a table for a specific selector.
	function listQuery (tableName, selector, selectValue) {

		var table = db.getSchema().table(tableName);

		if (selector) {

			return db.select(table.id, table.name).from(table)
				.where(table[selector].eq(selectValue)).exec();

		} else {
			return db.select(table.id, table.name).from(table).exec();
		}

	}

	// ----- Methods ----- //

	// Retrieves all songs in a library.
	exports.getSongs = function (library) {
		return listQuery('Songs', 'library', library);
	};

	// Retrieves all artists in a library.
	exports.getArtists = function (library) {
		return listQuery('Artists', 'library', library);
	};

	// Retrieves all albums in a library.
	exports.getAlbums = function (library) {
		return listQuery('Albums', 'library', library);
	};

	// Retrieves all albums for an artist.
	exports.getArtist = function (artist) {
		return listQuery('Albums', 'artist', artist);
	};

	// Retrieves all songs for an album.
	exports.getAlbum = function (album) {
		return listQuery('Songs', 'album', album);
	};

	// Retrieves all songs for an album.
	exports.getLibraries = function () {
		return listQuery('Libraries');
	};

	// ----- Constructor ----- //

	var schema = build();

	return connect(schema).then(syncData).then(function () {
		return exports;
	});

});

var Views = (function Views (db) {

	// ----- Properties ----- //

	var nav = document.getElementById('navigation');

	// ----- Functions ----- //

	function renderList (getData, selector, url) {

		getData(selector).then(function (data) {

			var list = listTemplate({ list: data, url: url });
			navigation.innerHTML = list;

		});

	}

	// ----- Routes ----- //

	page('/', function () {

		renderList(db.getLibraries, null, function (id) {
			return `/library/${id}`;
		});

	});

	page('/library/:id', function (ctx) {

		var id = parseInt(ctx.params.id);

		renderList(db.getArtists, id, function (id) {
			return `/artist/${id}`;
		});

	});

	// ----- Constructor ----- //

	page();

});


// ----- Functions ----- //

// Sets up navigation via click in the nav section.
function navClicks () {

	var nav = document.getElementById('navigation');

	nav.addEventListener('click', function (event) {

		var target = event.target;
		var id = target.parentNode.dataset.id;

		if (target.classList.contains('song')) {
			console.log(`Play song ${id}`);
		} else if (target.className === 'plus') {
			console.log(`Queue item ${id}`);
		}

	});

}

// Sets up interface.
function setup () {

	navClicks();
	Db().then(function (db) {
		var views = Views(db);
	}).catch(function (err) {
		console.log(err);
	});

}


// ----- Run ----- //

setup();
