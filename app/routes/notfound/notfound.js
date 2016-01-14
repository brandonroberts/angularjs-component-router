angular.module('app.404', []).directive('notfound', NotFoundRoute);

function NotFoundRoute(){
	return {
		template: 'Page Not Found',
		controller: NotFoundController
	};
}

function NotFoundController() {

}
