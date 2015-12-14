var app = angular.module('myApp', [
	'ngComponentRouter',
	'app.templates',
	'app.home',
	'app.about',
	'app.login',
	'app.admin',
	'app.admin.dashboard',
	'app.404'
]);

app.directive('app', AppDirective);

function AppDirective() {
	return {
		restrict: 'E',
		templateUrl: 'components/app/app.html',
		controller: ['$router', 'Auth', AppDirectiveController]
	};
}

function AppDirectiveController($router) {
	$router.config([
		{
			path: '/',
			component: 'home',
			name: 'Home'
		},
		{
			path: '/about/:name',
			component: 'about',
			name: 'About'
		},
		{
			path: '/login',
			component: 'login',
			name: 'Login'
		},
		{
			path: '/admin/...',
			component: 'admin',
			name: 'Admin'
		},
		{
			path: '/**',
			component: 'notfound',
			name: 'NotFound'
		}
	]);
}
