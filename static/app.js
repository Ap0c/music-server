// ----- Setup ----- //

var clientRouting = false;


// ----- Modules ----- //

var Db = (function Database () {

	return fetch('/db_version').then(function (res) {
		return res.json();
	}).then(function (parsed) {
		return parsed.version;
	}).catch(function (err) {
		console.error('Could not get db version.');
	});

});

var views = (function Views () {

});


// ----- Functions ----- //

// Sets up navigation via click in the nav section.
function navClicks () {

	var nav = document.getElementById('navigation');

	nav.addEventListener('click', function (event) {

		var target = event.target;
		var id = target.parentNode.dataset.id;

		if (target.classList.contains('song')) {
			console.log(`Play song ${id}`);
		} else if (target.className === 'plus') {
			console.log(`Queue item ${id}`);
		}

	});

}

// Sets up interface.
function setup () {

	navClicks();
	var db = Db().then(function (version) {
		console.log(version);
	});

}


// ----- Run ----- //

setup();
