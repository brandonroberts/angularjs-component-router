angular.module('app.login', ['app.services.auth']).component('login', {
	templateUrl: 'components/login/login.html',
	controller: ['Auth', LoginController],
	controllerAs: 'vm'
});

function LoginController(Auth) {
	this.Auth = Auth;
}

LoginController.prototype.login = function() {
	this.Auth.auth(this.username, this.password);
}