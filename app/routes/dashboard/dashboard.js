angular.module('app.admin.dashboard', []).directive('dashboard', DashboardRoute);

function DashboardRoute() {
  return  {
  	templateUrl: 'routes/dashboard/dashboard.html',
  	controller: DashboardController
  };
}

DashboardRoute.$canActivate = ['Auth', '$router', function(Auth, $router) {
  return Auth.check().then(function(auth) {
    if (auth) {
      return true;
    } else {
      $router.navigate(['/Login']);
      return false;
    }
  });
}];

function DashboardController() {
}
