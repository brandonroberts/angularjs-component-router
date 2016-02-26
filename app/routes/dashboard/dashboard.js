angular.module('app.admin.dashboard', []).component('dashboard', {
  templateUrl: 'routes/dashboard/dashboard.html',
  $canActivate: ['Auth', '$rootRouter', function(Auth, $rootRouter) {
    return Auth.check().then(function(auth) {
      if (auth) {
        return true;
      } else {
        $rootRouter.navigate(['/Login']);
        return false;
      }
    });
  }]
});
