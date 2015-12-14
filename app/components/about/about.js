angular.module('app.about', []).component('about', {
  restrict: 'EA',
	templateUrl: 'components/about/about.html',
	controller: AboutController
});

function AboutController() {
}

AboutController.prototype.$routerOnActivate = function(toRoute, fromRoute) {
	this.name = toRoute.params.name;
}
