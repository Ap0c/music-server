// ----- Setup ----- //

var clientRouting = false;


// ----- Modules ----- //

var db = (function Database () {

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


// ----- Run ----- //

navClicks();
