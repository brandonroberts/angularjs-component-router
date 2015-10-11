angular.module('app.services.auth', []).service('Auth', ['$q', Auth]);

function Auth($q) {
	this.loggedIn = false;
	this.$q = $q;
}

Auth.prototype.auth = function(username, password) {
	console.log(username, password);
	this.loggedIn = true;
}

Auth.prototype.check = function() {
	var _this = this;
	return this.$q(function(resolve, reject) {
		if (_this.loggedIn) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
}