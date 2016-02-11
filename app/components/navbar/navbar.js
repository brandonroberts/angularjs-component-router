angular.module('app.navbar', []).component('navBar', {
  templateUrl: 'components/navbar/navbar.html',
  controllerAs: 'vm',
  controller: ['Auth', '$router', function(Auth, $router) {
    var vm = this;

    vm.Auth = Auth;

    vm.logout = function() {
      vm.Auth.logout();
      $router.navigate(['/Home']);
    }
  }]
});
