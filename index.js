'use strict';

// ----- Requires ----- //

var express = require('express');


// ----- Setup ----- //

var app = express();


// ----- Routes ----- //

app.get('/', (req, res) => {
	res.send('hello world');
});


// ----- Run ----- //

app.listen(3000, () => {
	console.log('Running on 3000...');
});
