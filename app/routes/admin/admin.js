angular.module('app.admin', []).directive('admin', AdminRoute);

function AdminRoute() {
	return {
		templateUrl: 'routes/admin/admin.html',
		controller: AdminController
	};
}

AdminRoute.$routeConfig = [
	{
		path: '/dashboard',
		component: 'dashboard',
		name: 'Dashboard'
	}
];

function AdminController() {
}
