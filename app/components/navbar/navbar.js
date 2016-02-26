angular.module('app.navbar', []).component('navBar', {
  templateUrl: 'components/navbar/navbar.html',
  controllerAs: 'vm',
  controller: ['Auth', '$rootRouter', function(Auth, $rootRouter) {
    var vm = this;

    vm.Auth = Auth;

    vm.logout = function() {
      vm.Auth.logout();
      $rootRouter.navigate(['/Home']);
    }
  }]
});
