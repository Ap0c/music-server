// ----- Setup ----- //

var clientRouting = false;


// ----- Modules ----- //

var Db = (function Database () {

	// ----- Properties ----- //

	var db = null;


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

		schemaBuilder.createTable('DataVersion')
			.addColumn('id')
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

		console.log('Retrieving data');

		var artists = db.getSchema().table('Artists');
		var albums = db.getSchema().table('Albums');
		var songs = db.getSchema().table('Songs');

		var data = null;

		return db.delete().from(artists).exec().then(function () {
			return db.delete().from(albums).exec();
		}).then(function () {
			return db.delete().from(songs).exec();
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

		});

	}

	// Updates the data version locally.
	function updateVersion (version, table) {

		return retrieveData().then(function () {

			console.log('here');
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
				console.log(rows);
				return updateVersion(dataVersion, versionTable);
			}

		});

	}	

	// ----- Constructor ----- //

	var schema = build();

	return connect(schema).then(syncData);

});

var views = (function Views () {

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
	Db().then(function () {
		console.log('DB synced.');
	}).catch(function (err) {
		console.log(err);
	});

}


// ----- Run ----- //

setup();
