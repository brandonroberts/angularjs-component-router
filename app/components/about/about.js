angular.module('app.about', []).directive('about', AboutRoute);

function AboutRoute() {
  return {
  	template: 'About {{ vm.name }}',
  	controller: AboutController,
    controllerAs: 'vm'
  };
}

function AboutController() {
}

AboutController.prototype.$routerOnActivate = function(toRoute, fromRoute) {
	this.name = toRoute.params.name;
}
