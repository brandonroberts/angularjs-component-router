angular.module('app.about', []).component('about', {
  templateUrl: 'routes/about/about.html',
  controllerAs: 'vm',
  controller: function() {
    var vm = this;

    vm.$routerOnActivate = function(toRoute, fromRoute) {
    	this.name = toRoute.params.name;
    };
  }
});
