angular.module('app.login', ['app.services.auth']).component('login', {
	templateUrl: 'routes/login/login.html',
	controller: ['Auth', LoginController],
	controllerAs: 'vm'
});

function LoginController(Auth) {
	var vm = this;

	vm.Auth = Auth;

	vm.login = function() {
		vm.Auth.auth(this.username, this.password);
	}
}
