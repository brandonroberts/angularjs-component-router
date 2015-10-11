angular.module('app.admin.dashboard', []).component('dashboard', {
	templateUrl: 'components/dashboard/dashboard.html',
	controller: DashboardController,
	$canActivate: ['Auth', function(Auth) {
		return Auth.check();
	}]
});

function DashboardController() {
}