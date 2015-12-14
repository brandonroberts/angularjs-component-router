angular.module('app.admin', []).component('admin', {
	restrict: 'EA',
	templateUrl: 'components/admin/admin.html',
	controller: AdminController,
	$routeConfig: [
	  {
	    path: '/dashboard',
	    component: 'dashboard',
	    name: 'Dashboard'
	  }
	]
});

function AdminController() {
}
