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
			as: 'Home'
		},
		{
			path: '/about/:name',
			component: 'about',
			as: 'About'
		},
		{
			path: '/login',
			component: 'login',
			as: 'Login'
		},
		{
			path: '/admin/...',
			component: 'admin',
			as: 'Admin'
		},
		{
			path: '/**',
			component: 'notfound',
			as: 'NotFound'
		}
	]);
}