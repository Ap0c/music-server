'use strict';

// ----- Requires ----- //

let fs = require('fs');
let pug = require('pug');

let Db = require('./db');


// ----- Setup ----- //

// DB file and schema.
const DB_SCHEMA = 'schema.sql';
const DB_FILE = 'music.db';


// ----- Functions ----- //

// Compile a pug template to static files.
function compileTemplate (name) {

	let template = pug.compileFileClient(`views/${name}.pug`,
		{name: `${name}Template`});

	return new Promise((res, rej) => {

		fs.writeFile(`static/${name}-template.js`, template, (err) => {
			err ? rej(err) : res();
		});

	});

}

// Initialises the database with the schema.
function initDb () {

	let db = Db(DB_FILE);

	db.connect();

	return db.init(DB_SCHEMA).then(() => {
		db.close();
	}).catch((err) => {
		console.log(err);
	});

}


// ----- Run ----- //

let setupActions = [
	compileTemplate('list'),
	compileTemplate('menu'),
	compileTemplate('settings'),
	initDb()
];

Promise.all(setupActions);
