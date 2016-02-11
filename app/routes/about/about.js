angular.module('app.about', []).component('about', {
  template: 'About {{ vm.name }}',
  controllerAs: 'vm',
  controller: function() {
    var vm = this;

    vm.$routerOnActivate = function(toRoute, fromRoute) {
    	this.name = toRoute.params.name;
    };
  }
});
