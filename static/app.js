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
			.addColumn('path', lf.Type.STRING)
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
			return fetch('/db');
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

		return fetch('/db_version').then(function (res) {
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

	// Retrieves the id of the library for an item in given table.
	function getLibrary (table, id) {

		var query = db.select(table.library).from(table).where(table.id.eq(id));

		return query.exec().then(function (result) {
			return result[0].library;
		}).catch(function (err) {
			console.log(err);
		});

	}

	// ----- Methods ----- //

	// Connects to the database.
	exports.connect = function () {

		var schema = build();
		return connect(schema).then(syncData);

	};

	// Retrieves all songs in a library.
	exports.getSongs = function (library) {
		return listQuery('Songs', {name: 'library', value: library}, 'name');
	};

	// Retrieves all songs in a library with a name >= the name of the song
	// that matches the passed id.
	exports.songsSlice = function (library, id) {

		var songs = db.getSchema().table('Songs');
		var query = db.select(songs.name).from(songs).where(songs.id.eq(id));

		return query.exec().then(function (result) {

			var name = result[0].name;

			return db.select(songs.id, songs.name).from(songs).where(lf.op.and(
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

		return db.select(songs.id, songs.name).from(songs)
			.where(songs.artist.eq(artist)).exec();

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

	// Retrieves all libraries by name.
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

	// Gets the library of an artist by id.
	exports.getArtistLibrary = function (id) {

		var artists = db.getSchema().table('Artists');
		return getLibrary(artists, id);

	};

	// Gets the library of an album by id.
	exports.getAlbumLibrary = function (id) {

		var albums = db.getSchema().table('Albums');
		return getLibrary(albums, id);

	};

	// Retrieves all libraries and their paths.
	exports.libraryPaths = function () {

		var libraries = db.getSchema().table('Libraries');
		return db.select(libraries.name, libraries.path).from(libraries).exec();

	};

	// ----- Constructor ----- //

	return exports;

})();

var Views = (function Views () {

	// ----- Properties ----- //

	var view = navigation.dataset.view;
	var exports = {};

	// DOM Elements.
	var nav = document.getElementById('navigation');
	var locationTitle = document.getElementById('location-title');
	var menuIcon = document.getElementById('menu-icon');
	var playIcons = document.getElementsByClassName('play-icon');
	var pauseIcons = document.getElementsByClassName('pause-icon');
	var songNames = document.getElementsByClassName('song-name');
	var playerOverlay = document.getElementsByClassName('player-overlay')[0];
	var artistName = playerOverlay.getElementsByClassName('artist-name')[0];
	var albumName = playerOverlay.getElementsByClassName('album-name')[0];
	var upNext = playerOverlay.getElementsByClassName('up-next')[0];
	var menuOverlay = document.getElementsByClassName('menu-overlay')[0];
	var menuLinks = document.querySelectorAll('.menu-overlay a');
	var scanMessage = document.getElementById('scan-message');
	var addMessage = document.getElementById('add-message');

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

	// Fills out the menu overlay with the menu template.
	function buildMenu (library) {

		var links = {
			libraries: '/',
			settings: '/settings'
		};

		if (library) {
			links.libraryLinks = {};
			links.libraryLinks.artists = `/library/${library}`;
			links.libraryLinks.albums = `/library/${library}/albums`;
			links.libraryLinks.songs = `/library/${library}/songs`;
		}

		var menu = menuTemplate({ menuLinks: links });
		menuOverlay.innerHTML = menu;

		Controls.menuLinks();

	}

	// Renders the menu overlay.
	function renderMenu () {

		if (['artists', 'albums', 'songs'].indexOf(view.name) != -1) {
			buildMenu(view.id);
		} else if (view.name === 'artist') {
			Db.getArtistLibrary(view.id).then(buildMenu);
		} else if (view.name === 'album') {
			Db.getAlbumLibrary(view.id).then(buildMenu);
		} else {
			buildMenu();
		}

	}

	// Sets the location bar and page title, and displays the menu.
	function setTitle (title) {

		document.title = `Music - ${title}`;
		locationTitle.textContent = title;

	}

	// ----- Routes ----- //

	// Sets up routing with page.js.
	exports.setupRoutes = function () {

		// Displays libraries.
		page('/', function () {

			renderList(Db.getLibraries, null, function (id) {
				return `/library/${id}`;
			});

			setTitle('Music - Libraries');
			view = { name: 'libraries', id: null };
			renderMenu();

		});

		// Displays a library (list of artists).
		page('/library/:id', function (ctx) {

			var id = parseInt(ctx.params.id);

			renderList(Db.getArtists, id, function (id) {
				return `/artist/${id}`;
			});

			Db.libraryName(id).then(function (name) {
				setTitle(`${name} - Artists`);
			});

			view = { name: 'artists', id: id };
			renderMenu();

		});

		// Displays a library (list of songs).
		page('/library/:id/songs', function (ctx) {

			var id = parseInt(ctx.params.id);
			renderList(Db.getSongs, id);

			Db.libraryName(id).then(function (name) {
				setTitle(`${name} - Songs`);
			});

			view = { name: 'songs', id: id };
			renderMenu();

		});

		// Displays a library (list of albums).
		page('/library/:id/albums', function (ctx) {

			var id = parseInt(ctx.params.id);

			renderList(Db.getAlbums, id, function (id) {
				return `/album/${id}`;
			});

			Db.libraryName(id).then(function (name) {
				setTitle(`${name} - Albums`);
			});

			view = { name: 'albums', id: id };
			renderMenu();

		});

		// Displays an artist (list of albums).
		page('/artist/:id', function (ctx) {

			var id = parseInt(ctx.params.id);

			renderList(Db.getArtist, id, function (id) {
				return `/album/${id}`;
			});

			Db.artistName(id).then(setTitle);

			view = { name: 'artist', id: id };
			renderMenu();

		});

		// Displays an album (list of songs).
		page('/album/:id', function (ctx) {

			var id = parseInt(ctx.params.id);
			renderList(Db.getAlbum, id);

			Db.albumName(id).then(setTitle);

			view = { name: 'album', id: id };
			renderMenu();

		});

		page('/settings', function () {

			Db.libraryPaths().then(function (libraries) {

				var settings = settingsTemplate({ libraries: libraries });
				navigation.innerHTML = settings;
				Controls.settings();

			}).catch(function (err) {
				console.log(err);
			});

			view = { name: 'settings', id: null };
			renderMenu();

		});

		page({ dispatch: false });

	};

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

		var getNames = [Db.artistName(song.artist), Db.albumName(song.album)];

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

	// Adds songs to up next.
	exports.addNextSongs = function (songs) {

		var docFrag = document.createDocumentFragment();

		for (var song of songs) {

			var li = document.createElement('li');
			li.textContent = song.name;
			docFrag.appendChild(li);

		}

		upNext.appendChild(docFrag);

	};

	// Adds a single song by id, with option to add it to the back or the front.
	exports.addNextSong = function (id, front) {

		return Db.getSong(id).then(function (song) {

			if (front) {

				var li = document.createElement('li');
				li.textContent = song.name;
				upNext.insertBefore(li, upNext.firstChild);
				
			} else {
				exports.addNextSongs([song]);
			}

		});

	};

	// Clears the current song and the up next list.
	exports.clearSongs = function () {

		for (var i = 0, len = songNames.length; i < len; i++) {
			songNames[i].textContent = '-';
		}

		artistName.textContent = '-';
		albumName.textContent = '-';

		while (upNext.firstChild) {
			upNext.removeChild(upNext.firstChild);
		}

		exports.playIcon();

	};

	// Pops a song off the front of the next up list.
	exports.popNextSong = function () {
		upNext.removeChild(upNext.firstChild);
	};

	// Shows the menu overlay.
	exports.showMenu = function () {
		menuOverlay.classList.remove('hidden-overlay');
	};

	// Hides the menu overlay.
	exports.hideMenu = function () {
		menuOverlay.classList.add('hidden-overlay');
	};

	// Displays a message next to the scan button in settings.
	exports.scanMessage = function (message) {
		scanMessage.textContent = message;
	};

	// Displays a message next to the add button in settings.
	exports.addMessage = function (message) {
		addMessage.textContent = message;
	};

	// ----- Constructor ----- //

	return exports;

})();

var Player = (function Player () {

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

		return Db.getSong(id).then(function (song) {

			nowPlaying = song;
			Views.playingSong(song);
			var wasPaused = audio.paused;
			audio.src = musicPath + song.path;

			if (!wasPaused) {
				exports.play();
			}

		}).catch(function (err) {
			console.log(err);
		});

	}

	// ----- Methods ----- //

	// Plays the current song.
	exports.play = function () {

		audio.play();
		Views.pauseIcon();

	};

	// Pauses the current song.
	exports.pause = function () {

		audio.pause();
		Views.playIcon();

	};

	// Adds songs to the queue.
	exports.queue = function (ids) {

		upNext = upNext.concat(ids);

		if (!nowPlaying) {
			exports.next();
		}

	};

	// Skips to next song.
	exports.next = function () {

		if (upNext.length > 0) {

			if (nowPlaying) {
				previous.push(nowPlaying.id);
			}

			var id = upNext.shift();
			Views.popNextSong();
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
				Views.addNextSong(nowPlaying.id, true);

			}

			var id = previous.pop();
			return newSong(id);

		}

	};

	// Clears the queue.
	exports.clear = function () {

		nowPlaying = null;
		audio.src = '';
		upNext = [];
		previous = [];

	};

	// ----- Constructor ----- //

	audio.addEventListener('ended', function playNext () {
		exports.next().then(exports.play);
	});

	return exports;

})();

var Controls = (function Controls () {

	// ----- Functions ----- //

	// Queues songs retrieved from the passed getSongs function.
	function queueSongs (songs) {

		var ids = songs.map(function (song) {
			return song.id;
		});

		Views.addNextSongs(songs);
		Player.queue(ids);

	}

	// Queues songs in an album.
	function queueAlbum (albumId, songId) {

		return Db.getAlbum(albumId).then(function (songs) {

			var firstSong = songs.findIndex(function (song) {
				return song.id === songId;
			});

			queueSongs(songs.slice(firstSong));

		});

	}

	// Plays all songs in the current view.
	function playSongs (id) {

		var view = Views.view;
		Player.clear();
		Views.clearSongs();

		if (view.name === 'album') {
			return queueAlbum(view.id, id);
		} else if (view.name === 'songs') {
			return Db.songsSlice(view.id, id).then(queueSongs);
		}

	}

	// Queues songs from plus click based on current view.
	function plusQueue (id) {

		var view = Views.view;

		if (view.name === 'album' || view.name === 'songs') {

			Views.addNextSong(id).then(function () {
				Player.queue(id);
			});

		} else if (view.name === 'artist' || view.name === 'albums') {
			Db.getAlbum(id).then(queueSongs);
		} else if (view.name === 'artists') {
			Db.songsArtist(id).then(queueSongs);
		} else if (view.name === 'libraries') {
			Db.getSongs(id).then(queueSongs);
		}

	}

	// Event handlers for clicks on the nav section.
	function navClicks (argument) {

		var nav = document.getElementById('navigation');

		nav.addEventListener('click', function (event) {

			var target = event.target;
			var id = parseInt(target.parentNode.dataset.id);

			if (target.classList.contains('song')) {
				playSongs(id).then(Player.play);
			} else if (target.className === 'plus') {
				plusQueue(id);
			}

		});

	}

	// Event handlers for clicks related to the player.
	function playerClicks () {

		var playButtons = document.getElementsByClassName('play-icon');
		var pauseButtons = document.getElementsByClassName('pause-icon');
		var playerBarName = document.getElementById('player-bar-name');
		var closePlayer = document.getElementById('close-player');
		var ffButton = document.getElementById('ff-icon');
		var rewButton = document.getElementById('rew-icon');
		var clearUpNext = document.getElementById('clear-up-next');

		for (var i = 0, lenOne = pauseButtons.length; i < lenOne; i++) {
			pauseButtons[i].addEventListener('click', Player.pause);
		}

		for (var j = 0, lenTwo = playButtons.length; j < lenTwo; j++) {
			playButtons[j].addEventListener('click', Player.play);
		}

		playerBarName.addEventListener('click', Views.showPlayer);
		closePlayer.addEventListener('click', Views.hidePlayer);
		ffButton.addEventListener('click', Player.next);
		rewButton.addEventListener('click', Player.previous);

		clearUpNext.addEventListener('click', function () {

			Player.clear();
			Views.clearSongs();

		});

	}

	// Event handlers for menu links.
	function menuLinks () {

		var links = document.querySelectorAll('.menu-overlay a');
		var closeMenu = document.getElementById('close-menu');

		closeMenu.addEventListener('click', Views.hideMenu);

		for (var k = links.length - 1; k >= 0; k--) {
			links[k].addEventListener('click', Views.hideMenu);
		}

	}

	// Event handlers for clicks related to the menu.
	function menuClicks () {

		var menuIcon = document.getElementById('menu-icon');

		menuIcon.addEventListener('click', Views.showMenu);
		menuLinks();

	}

	// Event handlers for the scan button in settings.
	function scanClicks () {

		var scanButton = document.getElementById('scan');

		scanButton.addEventListener('click', function () {

			Views.scanMessage('Scanning...');

			fetch('/scan', { method: 'POST' }).then(function (res) {

				if (res.status === 204) {
					Views.scanMessage('Scan complete.');
					location.reload();
				} else {
					Views.scanMessage('Scan failed.');
				}

			});

		});

	}

	// Posts the library info to the server, and handles response.
	function addLibrary (info) {

		var response = null;
		var params = { method: 'POST', body: info, headers:
				{ 'Content-Type': 'application/json' } };

		fetch('/add_library', params).then(function (res) {

			response = res;
			return res.text();

		}).then(function (message) {

			if (response.status === 201) {
				Views.addMessage('Library added.');
			} else {
				Views.addMessage(message);
			}

		});

	}

	// Event handlers for adding a library in settings.
	function addLibraryClicks () {

		var addButton = document.getElementById('add');
		var libraryName = document.getElementById('name-input');
		var libraryPath = document.getElementById('library-path-input');

		addButton.addEventListener('click', function () {

			var data = JSON.stringify({
				name: libraryName.value,
				library_path: libraryPath.value
			});

			addLibrary(data);

		});

	}

	// Event handlers for the settings view.
	function settingsClicks () {

		scanClicks();
		addLibraryClicks();

	}

	// ----- Constructor ----- //

	navClicks();
	playerClicks();
	menuClicks();

	if (Views.view === 'settings') settingsClicks();

	return { menuLinks: menuLinks, settings: settingsClicks };

})();


// ----- Functions ----- //

// Sets up interface.
function setup () {

	Db.connect().then(function (Db) {

		Views.setupRoutes();
		Views.ready();

	}).catch(function (err) {
		console.log(err);
	});

}


// ----- Run ----- //

setup();
