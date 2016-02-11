angular.module('app.about', []).component('about', {
  template: 'About {{ vm.name }}',
  controllerAs: 'vm',
  $routerOnActivate: function(toRoute, fromRoute) {
  	this.name = toRoute.params.name;
  }
});
