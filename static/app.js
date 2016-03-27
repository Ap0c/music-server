// ----- Setup ----- //

var clientRouting = false;


// ----- Modules ----- //

var db = (function Database () {

});

var views = (function Views () {

});


// ----- Functions ----- //

// Retrieves the urls for list view items.
function navRoutes (currentView, id) {

	if (currentView === 'libraries') {
		location.assign(`/library/${id}`);
	} else if (currentView === 'artists') {
		location.assign(`/artist/${id}`);
	} else if (currentView === 'artist' || currentView === 'albums') {
		location.assign(`/album/${id}`);
	} else if (currentView === 'album') {
		console.log('Play song!');
	} else if (currentView === 'songs') {
		console.log('Play song!');
	}

}

// Sets up navigation via click in the nav section.
function navClicks () {

	var nav = document.getElementById('navigation');
	var view = nav.dataset.view;

	nav.addEventListener('click', function (event) {

		var target = event.target;
		var id = target.parentNode.dataset.id;

		if (target.tagName === 'SPAN') {

			if (target.className === 'list-name') {

				if (!clientRouting) {
					navRoutes(view, id);
				}

			}

		}

	});

}


// ----- Run ----- //

navClicks();
