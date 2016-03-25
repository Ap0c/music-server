CREATE TABLE IF NOT EXISTS artists
	(id INTEGER PRIMARY KEY, name TEXT, dirname TEXT);

CREATE TABLE IF NOT EXISTS albums
	(id INTEGER PRIMARY KEY, name TEXT, artist INTEGER, dirname TEXT
		FOREIGN KEY (artist) REFERENCES artists(id));

CREATE TABLE IF NOT EXISTS songs
	(id INTEGER PRIMARY KEY, name TEXT, number INTEGER, artist INTEGER, album INTEGER, path TEXT,
		FOREIGN KEY (artist) REFERENCES artists(id),
		FOREIGN KEY (album) REFERENCES albums(id));

CREATE TABLE IF NOT EXISTS libraries
	(id INTEGER PRIMARY KEY, name TEXT, path TEXT);
