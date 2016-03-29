// ----- Setup ----- //

var myPlayer = null;
var myViews = null;


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

	// Gets all items from a table for a specific selector, in a given order.
	function listQuery (tableName, selector, order) {

		var table = db.getSchema().table(tableName);
		var query = db.select(table.id, table.name).from(table);

		if (selector) {
			query = query.where(table[selector.name].eq(selector.value));
		}

		if (order) {
			query = query.orderBy(table[order]);
		}

		return query.exec();

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
		return listQuery('Songs', {name: 'library', value: library}, 'name');
	};

	// Retrieves all songs in a library with a name >= the name of the song
	// that matches the passed id.
	exports.songsSlice = function (library, id) {

		var songs = db.getSchema().table('Songs');

		return db.select(songs.name).from(songs).where(songs.id.eq(id)).exec()
			.then(function (result) {

			var name = result[0].name;

			return db.select(songs.id).from(songs).where(lf.op.and(
					songs.library.eq(library),
					songs.name.gte(name)
				)).orderBy(songs.name).exec();

		}).catch(function (err) {
			console.log(err);
		});

	};

	// Get all songs by a specific artist.
	exports.songsArtist = function (artist) {

		var songs = db.getSchema().table('Songs');

		return db.select(songs.id).from(songs).where(songs.artist.eq(artist))
			.exec();

	};

	// Retrieves all artists in a library.
	exports.getArtists = function (library) {
		return listQuery('Artists', {name: 'library', value: library}, 'name');
	};

	// Retrieves all albums in a library.
	exports.getAlbums = function (library) {
		return listQuery('Albums', {name: 'library', value: library}, 'name');
	};

	// Retrieves all albums for an artist.
	exports.getArtist = function (artist) {
		return listQuery('Albums', {name: 'artist', value: artist}, 'name');
	};

	// Retrieves all songs for an album.
	exports.getAlbum = function (album) {
		return listQuery('Songs', {name: 'album', value: album}, 'number');
	};

	// Retrieves song data.
	exports.getSong = function (id) {

		var songs = db.getSchema().table('Songs');

		return db.select().from(songs).where(songs.id.eq(id)).exec()
			.then(function (result) {
				return result[0];
		}).catch(function (err) {
			console.log(err);
		});

	};

	// Retrieves all songs for an album.
	exports.getLibraries = function () {
		return listQuery('Libraries', null, 'name');
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

	var view = navigation.dataset.view;
	var exports = {};

	// DOM Elements.
	var nav = document.getElementById('navigation');
	var locationBar = document.getElementById('location-bar');
	var playIcons = document.getElementsByClassName('play-icon');
	var pauseIcons = document.getElementsByClassName('pause-icon');
	var songNames = document.getElementsByClassName('song-name');
	var playerOverlay = document.getElementById('player-overlay');
	var artistName = playerOverlay.getElementsByClassName('artist-name')[0];
	var albumName = playerOverlay.getElementsByClassName('album-name')[0];

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

		view = { name: 'artists', id: id };

	});

	// Displays a library (list of songs).
	page('/library/:id/songs', function (ctx) {

		var id = parseInt(ctx.params.id);
		renderList(db.getSongs, id);

		db.libraryName(id).then(function (name) {
			setTitle(`${name} - Songs`);
		});

		view = { name: 'songs', id: id };

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

		view = { name: 'albums', id: id };

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

	// ----- Methods ----- //

	// Getter for the current view.
	Object.defineProperty(exports, 'view', {
		get: function () { return view; }
	});

	// Displays the controls.
	exports.ready = function () {

		var playbackIcons = document.getElementsByClassName('playback-icon');

		for (var i = 0, len = playbackIcons.length; i < len; i++) {
			playbackIcons[i].classList.remove('hidden');
		}

	};

	// Shows the play icon, hides the pause icon.
	exports.playIcon = function () {

		for (var i = 0, lenOne = pauseIcons.length; i < lenOne; i++) {
			pauseIcons[i].classList.add('display-off');
		}

		for (var j = 0, lenTwo = playIcons.length; j < lenTwo; j++) {
			playIcons[j].classList.remove('display-off');
		}

	};

	// Shows the pause icon, hides the play icon.
	exports.pauseIcon = function () {

		for (var i = 0, lenOne = pauseIcons.length; i < lenOne; i++) {
			pauseIcons[i].classList.remove('display-off');
		}

		for (var j = 0, lenTwo = playIcons.length; j < lenTwo; j++) {
			playIcons[j].classList.add('display-off');
		}

	};

	// Updates the currently playing song.
	exports.playingSong = function (song) {

		var getNames = [db.artistName(song.artist), db.albumName(song.album)];

		return Promise.all(getNames).then(function (names) {

			for (var i = 0, len = songNames.length; i < len; i++) {
				songNames[i].textContent = song.name;
			}

			artistName.textContent = names[0];
			albumName.textContent = names[1];

		}).catch(function (err) {
			console.log(err);
		});
		
	};

	// Shows the player overlay.
	exports.showPlayer = function () {
		playerOverlay.classList.remove('hidden-overlay');
	};

	// Hides the player overlay.
	exports.hidePlayer = function () {
		playerOverlay.classList.add('hidden-overlay');
	};

	// ----- Constructor ----- //

	page();

	return exports;

});

var Player = (function Player (db, views) {

	// ----- Properties ----- //

	var audio = new Audio();
	var upNext = [];
	var previous = [];
	var nowPlaying = null;
	var exports = {};
	var musicPath = '/static/music/';

	// ----- Functions ----- //

	// Starts playback of a new song.
	function newSong (id) {

		return db.getSong(id).then(function (song) {

			nowPlaying = song;
			views.playingSong(song);
			audio.src = musicPath + song.path;

		}).catch(function (err) {
			console.log(err);
		});

	}

	// ----- Methods ----- //

	// Plays the current song.
	exports.play = function () {

		audio.play();
		views.pauseIcon();
		
	};

	// Pauses the current song.
	exports.pause = function () {

		audio.pause();
		views.playIcon();

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
			return newSong(id);

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
			return newSong(id);

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

var Controls = (function Controls (db, views, player) {

	// ----- Properties ----- //

	var nav = document.getElementById('navigation');
	var playButtons = document.getElementsByClassName('play-icon');
	var pauseButtons = document.getElementsByClassName('pause-icon');

	// ----- Functions ----- //

	// Play the next song.
	function playNext () {
		player.next().then(player.play);
	}

	// Queues songs retrieved from the passed getSongs function.
	function queueSongs (songs) {

		var ids = songs.map(function (song) {
			return song.id;
		});

		player.queue(ids);

	}

	// Queues songs in an album.
	function queueAlbum (albumId, songId) {

		return db.getAlbum(albumId).then(function (songs) {

			var firstSong = songs.findIndex(function (song) {
				return song.id === songId;
			});

			queueSongs(songs.slice(firstSong));

		});

	}

	// Plays all songs in the current view.
	function playSongs (id) {

		var view = views.view;
		player.clear();

		if (view.name === 'album') {
			return queueAlbum(view.id, id);
		} else if (view.name === 'songs') {
			return db.songsSlice(view.id, id).then(queueSongs);
		}

	}

	// Queues songs from plus click based on current view.
	function plusQueue (id) {

		var view = views.view;

		if (view.name === 'album' || view.name === 'songs') {
			player.queue(id);
		} else if (view.name === 'artist' || view.name === 'albums') {
			db.getAlbum(id).then(queueSongs);
		} else if (view.name === 'artists') {
			db.songsArtist(id).then(queueSongs);
		} else if (view.name === 'libraries') {
			db.getSongs(id).then(queueSongs);
		}

	}

	// ----- Constructor ----- //

	nav.addEventListener('click', function (event) {

		var target = event.target;
		var id = parseInt(target.parentNode.dataset.id);

		if (target.classList.contains('song')) {
			playSongs(id).then(playNext);
		} else if (target.className === 'plus') {
			plusQueue(id);
		}

	});

	for (var i = 0, lenOne = pauseButtons.length; i < lenOne; i++) {
		pauseButtons[i].addEventListener('click', player.pause);
	}

	for (var j = 0, lenTwo = playButtons.length; j < lenTwo; j++) {
		playButtons[j].addEventListener('click', player.play);
	}

});


// ----- Functions ----- //

// Sets up interface.
function setup () {

	Db().then(function (db) {

		var views = Views(db);
		var player = Player(db, views);
		myPlayer = player;
		myViews = views;

		var controls = Controls(db, views, player);
		views.ready();

	}).catch(function (err) {
		console.log(err);
	});

}


// ----- Run ----- //

setup();
