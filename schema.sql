CREATE TABLE IF NOT EXISTS libraries
	(id INTEGER PRIMARY KEY, name TEXT, path TEXT);

CREATE TABLE IF NOT EXISTS artists
	(id INTEGER PRIMARY KEY, name TEXT, dirname TEXT, library INTEGER,
		FOREIGN KEY (library) REFERENCES libraries(id));

CREATE TABLE IF NOT EXISTS albums
	(id INTEGER PRIMARY KEY, name TEXT, artist INTEGER, dirname TEXT, library INTEGER,
		FOREIGN KEY (artist) REFERENCES artists(id),
		FOREIGN KEY (library) REFERENCES libraries(id));

CREATE TABLE IF NOT EXISTS songs
	(id INTEGER PRIMARY KEY, name TEXT, number INTEGER, artist INTEGER, album INTEGER, path TEXT, library INTEGER,
		FOREIGN KEY (artist) REFERENCES artists(id),
		FOREIGN KEY (album) REFERENCES albums(id),
		FOREIGN KEY (library) REFERENCES libraries(id));
