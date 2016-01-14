angular.module('app.home', []).directive('home', HomeRoute);

function HomeRoute() {
  return {
  	templateUrl: 'routes/home/home.html',
  	controller: HomeController
  };
}

function HomeController() {

}
