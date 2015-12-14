angular.module('app.about', []).component('about', {
  restrict: 'EA',
	template: 'About {{ vm.name }}',
	controller: AboutController,
  controllerAs: 'vm'
});

function AboutController() {
}

AboutController.prototype.$routerOnActivate = function(toRoute, fromRoute) {
	this.name = toRoute.params.name;
}
