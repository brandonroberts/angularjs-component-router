var app = angular.module('myApp', [
	'ngComponentRouter',
	'app.templates',
	'app.home',
	'app.navbar',
	'app.about',
	'app.login',
	'app.admin',
	'app.admin.dashboard',
	'app.404'
]);

app.value('$routerRootComponent', 'app');
app.component('app', {
	templateUrl: 'components/app/app.html',
	$routeConfig: [
		{ path: '/', component: 'home', name: 'Home' },
		{ path: '/about/:name', component: 'about', name: 'About' },
		{ path: '/login', component: 'login', name: 'Login' },
		{ path: '/admin/...', component: 'admin', name: 'Admin' },
		{ path: '/**', component: 'notfound', name: 'NotFound' }
	]
});
