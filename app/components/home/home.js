angular.module('app.home', []).directive('home', HomeRoute);

function HomeRoute() {
  return {
  	templateUrl: 'components/home/home.html',
  	controller: HomeController
  };
}

function HomeController() {

}
