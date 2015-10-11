angular.module('app.about', []).component('about', {
	templateUrl: 'components/about/about.html',
	controller: AboutController
});

function AboutController() {
}

AboutController.prototype.$onActivate = function(toRoute, fromRoute) {
	this.name = toRoute.params.name;
}