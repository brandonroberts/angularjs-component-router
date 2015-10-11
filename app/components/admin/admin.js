angular.module('app.admin', []).component('admin', {
	templateUrl: 'components/admin/admin.html',
	controller: AdminController,
	$routeConfig: [
	  {
	    path: '/dashboard',
	    component: 'dashboard',
	    as: 'Dashboard'
	  }
	]
});

function AdminController() {
}