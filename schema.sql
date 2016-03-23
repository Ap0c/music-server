CREATE TABLE IF NOT EXISTS artists
	(id INTEGER PRIMARY KEY, name TEXT);

CREATE TABLE IF NOT EXISTS albums
	(id INTEGER PRIMARY KEY, name TEXT, artist INTEGER,
		FOREIGN KEY (artist) REFERENCES artists(id));

CREATE TABLE IF NOT EXISTS songs
	(id INTEGER PRIMARY KEY, name TEXT, artist INTEGER, album INTEGER, url TEXT,
		FOREIGN KEY (artist) REFERENCES artists(id),
		FOREIGN KEY (album) REFERENCES albums(id));
