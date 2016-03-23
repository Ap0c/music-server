'use strict';

// ----- Requires ----- //

let fs = require('fs');


// ----- Exports ----- //

module.exports = function scan (directory) {

	fs.readdir(directory, (err, files) => {

		console.log(files);

		for (let file of files) {

			fs.stat(`${directory}/${file}`, (err, stats) => {
				console.log(stats.isDirectory());
			});

		}

	});

};
