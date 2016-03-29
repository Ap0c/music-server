// ----- Setup ----- //

var myPlayer = null;


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

	// Retrieves a name by id from a given table.
	function getName (tableName, id) {

		var table = db.getSchema().table(tableName);

		return db.select(table.name).from(table).where(table.id.eq(id)).exec()
			.then(function (name) {
				return name[0].name;
			});

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

	// Retrieves song data.
	exports.getSong = function (id) {

		var songs = db.getSchema().table('Songs');

		return db.select().from(songs).where(songs.id.eq(id)).exec()
			.then(function (result) {
				return result[0];
			});

	};

	// Retrieves all songs for an album.
	exports.getLibraries = function () {
		return listQuery('Libraries');
	};

	// Retrieves the name of a library.
	exports.libraryName = function (id) {
		return getName('Libraries', id);
	};

	// Retrieves the name of an artist.
	exports.artistName = function (id) {
		return getName('Artists', id);
	};

	// Retrieves the name of an album.
	exports.albumName = function (id) {
		return getName('Albums', id);
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
	var locationBar = document.getElementById('location-bar');
	var view = navigation.dataset.view;

	// ----- Functions ----- //

	// Renders the navigation section with a list of items.
	function renderList (getData, selector, url) {

		getData(selector).then(function (data) {

			var list = listTemplate({ list: data, url: url });
			navigation.innerHTML = list;

		}).catch(function (err) {
			console.log(err);
		});

	}

	// Sets the location bar and page title.
	function setTitle (title) {

		document.title = `Music - ${title}`;
		locationBar.textContent = title;

	}

	// ----- Routes ----- //

	// Displays libraries.
	page('/', function () {

		renderList(db.getLibraries, null, function (id) {
			return `/library/${id}`;
		});

		setTitle('Music - Libraries');
		view = { name: 'libraries', id: null };

	});

	// Displays a library (list of artists).
	page('/library/:id', function (ctx) {

		var id = parseInt(ctx.params.id);

		renderList(db.getArtists, id, function (id) {
			return `/artist/${id}`;
		});

		db.libraryName(id).then(function (name) {
			setTitle(`${name} - Artists`);
		});

		view = { name: 'libraryArtists', id: id };

	});

	// Displays a library (list of songs).
	page('/library/:id/songs', function (ctx) {

		var id = parseInt(ctx.params.id);
		renderList(db.getSongs, id);

		db.libraryName(id).then(function (name) {
			setTitle(`${name} - Songs`);
		});

		view = { name: 'librarySongs', id: id };

	});

	// Displays a library (list of albums).
	page('/library/:id/albums', function (ctx) {

		var id = parseInt(ctx.params.id);

		renderList(db.getAlbums, id, function (id) {
			return `/album/${id}`;
		});

		db.libraryName(id).then(function (name) {
			setTitle(`${name} - Albums`);
		});

		view = { name: 'libraryAlbums', id: id };

	});

	// Displays an artist (list of albums).
	page('/artist/:id', function (ctx) {

		var id = parseInt(ctx.params.id);

		renderList(db.getArtist, id, function (id) {
			return `/album/${id}`;
		});

		db.artistName(id).then(setTitle);

		view = { name: 'artist', id: id };

	});

	// Displays an album (list of songs).
	page('/album/:id', function (ctx) {

		var id = parseInt(ctx.params.id);
		renderList(db.getAlbum, id);

		db.albumName(id).then(setTitle);

		view = { name: 'album', id: id };

	});

	// ----- Constructor ----- //

	page();

	return {
		get view () {
			return view;
		}
	};

});

var Player = (function Player (db, views) {

	// ----- Properties ----- //

	var audio = new Audio();
	var upNext = [];
	var previous = [];
	var nowPlaying = null;
	var exports = {};
	var musicPath = '/static/music/';

	// ----- Methods ----- //

	// Starts playback of a new song.
	function newSong (id) {

		db.getSong(id).then(function (song) {

			nowPlaying = song;
			audio.src = musicPath + song.path;

		});

	}

	// Plays the current song.
	exports.play = function () {

		if (audio.paused) {
			audio.play();
		}

		// console.log(nowPlaying.name);
		console.log(upNext);

	};

	// Pauses the current song.
	exports.pause = function () {

		if (!audio.paused) {
			audio.pause();
		}

	};

	// Adds songs to the queue.
	exports.queue = function (ids) {
		upNext = upNext.concat(ids);
	};

	// Skips to next song.
	exports.next = function () {

		if (upNext.length > 0) {

			if (nowPlaying) {
				previous.push(nowPlaying.id);
			}

			var id = upNext.shift();

			newSong(id);
			exports.play();

		}

	};

	// Skips to start of current song, or to previous song.
	exports.previous = function () {

		if (audio.currentTime > 10) {
			audio.currentTime = 0;
		} else if (previous.length > 0) {

			if (nowPlaying) {
				upNext.unshift(nowPlaying.id);
			}

			var id = previous.pop();

			exports.newSong(id);
			exports.play();

		}

	};

	// Clears the queue.
	exports.clear = function () {

		nowPlaying = null;
		upNext = [];
		previous = [];

	};

	// ----- Constructor ----- //

	return exports;

});


// ----- Functions ----- //

// Queues songs retrieved from the passed getSongs function.
function queueSongs (getSongs, selector, player) {

	console.log('Queueing');

	return getSongs(selector).then(function (songs) {

		var ids = songs.map(function (song) {
			return song.id;
		});

		player.queue(ids);

	}).catch(function (err) {
		console.log(err);
	});

}

// Plays all songs in the current view.
function playSongs (db, player, views) {

	console.log('Playing');
	var currentView = views.view;
	player.clear();

	if (currentView.name === 'album') {
		queueSongs(db.getAlbum, currentView.id, player).then(play);
	} else if (currentView.name === 'librarySongs') {
		queueSongs(db.getSongs, currentView.id, player).then(play);
	}

	function play () {

		player.next();
		player.play();

	}

}

// Sets up navigation via click in the nav section.
function playbackControl (db, player, views) {

	var nav = document.getElementById('navigation');

	nav.addEventListener('click', function (event) {

		var target = event.target;
		var id = parseInt(target.parentNode.dataset.id);

		if (target.classList.contains('song')) {
			playSongs(db, player, views);
		} else if (target.className === 'plus') {
			player.queue(id);
		}

	});

}

// Sets up interface.
function setup () {

	Db().then(function (db) {

		var views = Views(db);
		var player = Player(db);
		myPlayer = player;
		playbackControl(db, player, views);

	}).catch(function (err) {
		console.log(err);
	});

}


// ----- Run ----- //

setup();
