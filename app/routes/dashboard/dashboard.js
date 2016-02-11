angular.module('app.admin.dashboard', []).component('dashboard', {
  templateUrl: 'routes/dashboard/dashboard.html',
  $canActivate: ['Auth', '$router', function(Auth, $router) {
    return Auth.check().then(function(auth) {
      if (auth) {
        return true;
      } else {
        $router.navigate(['/Login']);
        return false;
      }
    });
  }]
});
