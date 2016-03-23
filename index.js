'use strict';

// ----- Requires ----- //

var express = require('express');


// ----- Setup ----- //

var app = express();
app.use(express.static('static'));


// ----- Routes ----- //

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/app.html');
});


// ----- Run ----- //

app.listen(3000, () => {
	console.log('Running on 3000...');
});
