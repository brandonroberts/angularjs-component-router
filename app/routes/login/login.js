angular.module('app.login', ['app.services.auth']).component('login', {
	templateUrl: 'routes/login/login.html',
	controller: ['Auth', LoginController],
	controllerAs: 'vm'
});

function LoginController(Auth) {
	var _this = this;

	this.Auth = Auth;
	this.Auth.check()
		.then(function(result) {
			_this.authenticated = result;
		});
}

LoginController.prototype.login = function() {
	var _this = this;
	this.Auth.auth(this.username, this.password)
		.then(function(result) {
			_this.authenticated = result;
		});
}
