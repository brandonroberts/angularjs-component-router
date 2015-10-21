(function(){
///<reference path="../typings/angularjs/angular.d.ts"/>
/*
 * decorates $compileProvider so that we have access to routing metadata
 */
function compilerProviderDecorator($compileProvider, $$directiveIntrospectorProvider) {
    var directive = $compileProvider.directive;
    $compileProvider.directive = function (name, factory) {
        $$directiveIntrospectorProvider.register(name, factory);
        return directive.apply(this, arguments);
    };
}
/*
 * private service that holds route mappings for each controller
 */
var DirectiveIntrospectorProvider = (function () {
    function DirectiveIntrospectorProvider() {
        this.directiveBuffer = [];
        this.directiveFactoriesByName = {};
        this.onDirectiveRegistered = null;
    }
    DirectiveIntrospectorProvider.prototype.register = function (name, factory) {
        if (angular.isArray(factory)) {
            factory = factory[factory.length - 1];
        }
        this.directiveFactoriesByName[name] = factory;
        if (this.onDirectiveRegistered) {
            this.onDirectiveRegistered(name, factory);
        }
        else {
            this.directiveBuffer.push({ name: name, factory: factory });
        }
    };
    DirectiveIntrospectorProvider.prototype.$get = function () {
        var _this = this;
        var fn = function (newOnControllerRegistered) {
            _this.onDirectiveRegistered = newOnControllerRegistered;
            while (_this.directiveBuffer.length > 0) {
                var directive = _this.directiveBuffer.pop();
                _this.onDirectiveRegistered(directive.name, directive.factory);
            }
        };
        fn.getTypeByName = function (name) { return _this.directiveFactoriesByName[name]; };
        return fn;
    };
    return DirectiveIntrospectorProvider;
})();
/**
 * @name ngOutlet
 *
 * @description
 * An ngOutlet is where resolved content goes.
 *
 * ## Use
 *
 * ```html
 * <div ng-outlet="name"></div>
 * ```
 *
 * The value for the `ngOutlet` attribute is optional.
 */
function ngOutletDirective($animate, $q, $router) {
    var rootRouter = $router;
    return {
        restrict: 'AE',
        transclude: 'element',
        terminal: true,
        priority: 400,
        require: ['?^^ngOutlet', 'ngOutlet'],
        link: outletLink,
        controller: (function () {
            function class_1() {
            }
            return class_1;
        })(),
        controllerAs: '$$ngOutlet'
    };
    function outletLink(scope, element, attrs, ctrls, $transclude) {
        var Outlet = (function () {
            function Outlet(controller, router) {
                this.controller = controller;
                this.router = router;
            }
            Outlet.prototype.cleanupLastView = function () {
                var _this = this;
                if (this.previousLeaveAnimation) {
                    $animate.cancel(this.previousLeaveAnimation);
                    this.previousLeaveAnimation = null;
                }
                if (this.currentScope) {
                    this.currentScope.$destroy();
                    this.currentScope = null;
                }
                if (this.currentElement) {
                    this.previousLeaveAnimation = $animate.leave(this.currentElement);
                    this.previousLeaveAnimation.then(function () { return _this.previousLeaveAnimation = null; });
                    this.currentElement = null;
                }
            };
            Outlet.prototype.reuse = function (instruction) {
                var next = $q.when(true);
                var previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                if (this.currentController && this.currentController.$onReuse) {
                    next = $q.when(this.currentController.$onReuse(this.currentInstruction, previousInstruction));
                }
                return next;
            };
            Outlet.prototype.canReuse = function (nextInstruction) {
                var result;
                if (!this.currentInstruction ||
                    this.currentInstruction.componentType !== nextInstruction.componentType) {
                    result = false;
                }
                else if (this.currentController && this.currentController.$canReuse) {
                    result = this.currentController.$canReuse(nextInstruction, this.currentInstruction);
                }
                else {
                    result = nextInstruction === this.currentInstruction ||
                        angular.equals(nextInstruction.params, this.currentInstruction.params);
                }
                return $q.when(result);
            };
            Outlet.prototype.canDeactivate = function (instruction) {
                if (this.currentController && this.currentController.$canDeactivate) {
                    return $q.when(this.currentController.$canDeactivate(instruction, this.currentInstruction));
                }
                return $q.when(true);
            };
            Outlet.prototype.deactivate = function (instruction) {
                if (this.currentController && this.currentController.$onDeactivate) {
                    return $q.when(this.currentController.$onDeactivate(instruction, this.currentInstruction));
                }
                return $q.when();
            };
            Outlet.prototype.activate = function (instruction) {
                var _this = this;
                var previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                var componentName = this.controller.$$componentName = instruction.componentType;
                if (typeof componentName !== 'string') {
                    throw new Error('Component is not a string for ' + instruction.urlPath);
                }
                this.controller.$$routeParams = instruction.params;
                this.controller.$$template = '<div ' + dashCase(componentName) + '></div>';
                this.controller.$$router = this.router.childRouter(instruction.componentType);
                var newScope = scope.$new();
                var clone = $transclude(newScope, function (clone) {
                    $animate.enter(clone, null, _this.currentElement || element);
                    _this.cleanupLastView();
                });
                this.currentElement = clone;
                this.currentScope = newScope;
                // TODO: prefer the other directive retrieving the controller
                // by debug mode
                this.currentController = this.currentElement.children().eq(0).controller(componentName);
                if (this.currentController && this.currentController.$onActivate) {
                    return this.currentController.$onActivate(instruction, previousInstruction);
                }
                return $q.when();
            };
            return Outlet;
        })();
        var parentCtrl = ctrls[0], myCtrl = ctrls[1], router = (parentCtrl && parentCtrl.$$router) || rootRouter;
        myCtrl.$$currentComponent = null;
        router.registerPrimaryOutlet(new Outlet(myCtrl, router));
    }
}
/**
 * This directive is responsible for compiling the contents of ng-outlet
 */
function ngOutletFillContentDirective($compile) {
    return {
        restrict: 'EA',
        priority: -400,
        require: 'ngOutlet',
        link: function (scope, element, attrs, ctrl) {
            var template = ctrl.$$template;
            element.html(template);
            var link = $compile(element.contents());
            link(scope);
            // TODO: move to primary directive
            var componentInstance = scope[ctrl.$$componentName];
            if (componentInstance) {
                ctrl.$$currentComponent = componentInstance;
                componentInstance.$router = ctrl.$$router;
                componentInstance.$routeParams = ctrl.$$routeParams;
            }
        }
    };
}
/**
 * @name ngLink
 * @description
 * Lets you link to different parts of the app, and automatically generates hrefs.
 *
 * ## Use
 * The directive uses a simple syntax: `ng-link="componentName({ param: paramValue })"`
 *
 * ## Example
 *
 * ```js
 * angular.module('myApp', ['ngComponentRouter'])
 *   .controller('AppController', ['$router', function($router) {
 *     $router.config({ path: '/user/:id', component: 'user' });
 *     this.user = { name: 'Brian', id: 123 };
 *   });
 * ```
 *
 * ```html
 * <div ng-controller="AppController as app">
 *   <a ng-link="user({id: app.user.id})">{{app.user.name}}</a>
 * </div>
 * ```
 */
function ngLinkDirective($router, $parse) {
    var rootRouter = $router;
    return { require: '?^^ngOutlet', restrict: 'A', link: ngLinkDirectiveLinkFn };
    function ngLinkDirectiveLinkFn(scope, element, attrs, ctrl) {
        var router = (ctrl && ctrl.$$router) || rootRouter;
        if (!router) {
            return;
        }
        var instruction = null;
        var link = attrs.ngLink || '';
        function getLink(params) {
            instruction = router.generate(params);
            return './' + angular.stringifyInstruction(instruction);
        }
        var routeParamsGetter = $parse(link);
        // we can avoid adding a watcher if it's a literal
        if (routeParamsGetter.constant) {
            var params = routeParamsGetter();
            element.attr('href', getLink(params));
        }
        else {
            scope.$watch(function () { return routeParamsGetter(scope); }, function (params) { return element.attr('href', getLink(params)); }, true);
        }
        element.on('click', function (event) {
            if (event.which !== 1 || !instruction) {
                return;
            }
            $router.navigateByInstruction(instruction);
            event.preventDefault();
        });
    }
}
function dashCase(str) {
    return str.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); });
}
/*
 * A module for adding new a routing system Angular 1.
 */
angular.module('ngComponentRouter', [])
    .directive('ngOutlet', ngOutletDirective)
    .directive('ngOutlet', ngOutletFillContentDirective)
    .directive('ngLink', ngLinkDirective);
/*
 * A module for inspecting controller constructors
 */
angular.module('ng')
    .provider('$$directiveIntrospector', DirectiveIntrospectorProvider)
    .config(compilerProviderDecorator);

angular.module('ngComponentRouter').
    value('$route', null). // can be overloaded with ngRouteShim
    factory('$router', ['$q', '$location', '$$directiveIntrospector', '$browser', '$rootScope', '$injector', routerFactory]);

function routerFactory($q, $location, $$directiveIntrospector, $browser, $rootScope, $injector) {

  // When this file is processed, the line below is replaced with
  // the contents of `../lib/facades.es5`.
  function CONST() {
  return (function(target) {
    return target;
  });
}

function CONST_EXPR(expr) {
  return expr;
}

function isPresent (x) {
  return !!x;
}

function isBlank (x) {
  return !x;
}

function isString(obj) {
  return typeof obj === 'string';
}

function isType (x) {
  return typeof x === 'function';
}

function isStringMap(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isArray(obj) {
  return Array.isArray(obj);
}

function getTypeNameForDebugging (fn) {
  return fn.name || 'Root';
}

var PromiseWrapper = {
  resolve: function (reason) {
    return $q.when(reason);
  },

  reject: function (reason) {
    return $q.reject(reason);
  },

  catchError: function (promise, fn) {
    return promise.then(null, fn);
  },
  all: function (promises) {
    return $q.all(promises);
  }
};

var RegExpWrapper = {
  create: function(regExpStr, flags) {
    flags = flags ? flags.replace(/g/g, '') : '';
    return new RegExp(regExpStr, flags + 'g');
  },
  firstMatch: function(regExp, input) {
    regExp.lastIndex = 0;
    return regExp.exec(input);
  },
  matcher: function (regExp, input) {
    regExp.lastIndex = 0;
    return { re: regExp, input: input };
  }
};

var reflector = {
  annotations: function (fn) {
    //TODO: implement me
    return fn.annotations || [];
  }
};

var MapWrapper = {
  create: function() {
    return new Map();
  },

  get: function(m, k) {
    return m.get(k);
  },

  set: function(m, k, v) {
    return m.set(k, v);
  },

  contains: function (m, k) {
    return m.has(k);
  },

  forEach: function (m, fn) {
    return m.forEach(fn);
  }
};

var StringMapWrapper = {
  create: function () {
    return {};
  },

  set: function (m, k, v) {
    return m[k] = v;
  },

  get: function (m, k) {
    return m.hasOwnProperty(k) ? m[k] : undefined;
  },

  contains: function (m, k) {
    return m.hasOwnProperty(k);
  },

  keys: function(map) {
    return Object.keys(map);
  },

  isEmpty: function(map) {
    for (var prop in map) {
      if (map.hasOwnProperty(prop)) {
        return false;
      }
    }
    return true;
  },

  delete: function(map, key) {
    delete map[key];
  },

  forEach: function (m, fn) {
    for (var prop in m) {
      if (m.hasOwnProperty(prop)) {
        fn(m[prop], prop);
      }
    }
  },

  equals: function (m1, m2) {
    var k1 = Object.keys(m1);
    var k2 = Object.keys(m2);
    if (k1.length != k2.length) {
      return false;
    }
    var key;
    for (var i = 0; i < k1.length; i++) {
      key = k1[i];
      if (m1[key] !== m2[key]) {
        return false;
      }
    }
    return true;
  },

  merge: function(m1, m2) {
    var m = {};
    for (var attr in m1) {
      if (m1.hasOwnProperty(attr)) {
        m[attr] = m1[attr];
      }
    }
    for (var attr in m2) {
      if (m2.hasOwnProperty(attr)) {
        m[attr] = m2[attr];
      }
    }
    return m;
  }
};

var List = Array;
var ListWrapper = {
  create: function () {
    return [];
  },

  push: function (l, v) {
    return l.push(v);
  },

  forEach: function (l, fn) {
    return l.forEach(fn);
  },

  first: function(array) {
    if (!array)
      return null;
    return array[0];
  },

  map: function (l, fn) {
    return l.map(fn);
  },

  join: function (l, str) {
    return l.join(str);
  },

  reduce: function(list, fn, init) {
    return list.reduce(fn, init);
  },

  filter: function(array, pred) {
    return array.filter(pred);
  },

  concat: function(a, b) {
    return a.concat(b);
  },

  slice: function(l) {
    var from = arguments[1] !== (void 0) ? arguments[1] : 0;
    var to = arguments[2] !== (void 0) ? arguments[2] : null;
    return l.slice(from, to === null ? undefined : to);
  },

  maximum: function(list, predicate) {
    if (list.length == 0) {
      return null;
    }
    var solution = null;
    var maxValue = -Infinity;
    for (var index = 0; index < list.length; index++) {
      var candidate = list[index];
      if (isBlank(candidate)) {
        continue;
      }
      var candidateValue = predicate(candidate);
      if (candidateValue > maxValue) {
        solution = candidate;
        maxValue = candidateValue;
      }
    }
    return solution;
  }
};

var StringWrapper = {
  equals: function (s1, s2) {
    return s1 === s2;
  },

  split: function(s, re) {
    return s.split(re);
  },

  substring: function(s, start, end) {
    return s.substr(start, end);
  },

  replaceAll: function(s, from, replace) {
    return s.replace(from, replace);
  },

  startsWith: function(s, start) {
    return s.substr(0, start.length) === start;
  },

  replaceAllMapped: function(s, from, cb) {
    return s.replace(from, function(matches) {
      // Remove offset & string from the result array
      matches.splice(-2, 2);
      // The callback receives match, p1, ..., pn
      return cb.apply(null, matches);
    });
  },

  contains: function(s, substr) {
    return s.indexOf(substr) != -1;
  }

};

//TODO: implement?
// I think it's too heavy to ask 1.x users to bring in Rx for the router...
function EventEmitter() {}

var BaseException = Error;

var ObservableWrapper = {
  callNext: function(ob, val) {
    ob.fn(val);
  },

  subscribe: function(ob, fn) {
    ob.fn = fn;
  }
};

// TODO: https://github.com/angular/angular.js/blob/master/src/ng/browser.js#L227-L265
var $__router_47_location__ = {
  Location: Location
};

function Location(){}
Location.prototype.subscribe = function () {
  //TODO: implement
};
Location.prototype.path = function () {
  return $location.path();
};
Location.prototype.go = function (url) {
  return $location.path(url);
};


  var exports = {Injectable: function () {}};
  var require = function () {return exports;};

  // When this file is processed, the line below is replaced with
  // the contents of the compiled TypeScript classes.
  var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var RouteLifecycleHook = (function () {
    function RouteLifecycleHook(name) {
        this.name = name;
    }
    RouteLifecycleHook = __decorate([
        CONST()
    ], RouteLifecycleHook);
    return RouteLifecycleHook;
})();
exports.RouteLifecycleHook = RouteLifecycleHook;
var CanActivate = (function () {
    function CanActivate(fn) {
        this.fn = fn;
    }
    CanActivate = __decorate([
        CONST()
    ], CanActivate);
    return CanActivate;
})();
exports.CanActivate = CanActivate;
exports.canReuse = CONST_EXPR(new RouteLifecycleHook("canReuse"));
exports.canDeactivate = CONST_EXPR(new RouteLifecycleHook("canDeactivate"));
exports.onActivate = CONST_EXPR(new RouteLifecycleHook("onActivate"));
exports.onReuse = CONST_EXPR(new RouteLifecycleHook("onReuse"));
exports.onDeactivate = CONST_EXPR(new RouteLifecycleHook("onDeactivate"));
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * This class represents a parsed URL
 */
var Url = (function () {
    function Url(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = null; }
        this.path = path;
        this.child = child;
        this.auxiliary = auxiliary;
        this.params = params;
    }
    Url.prototype.toString = function () {
        return this.path + this._matrixParamsToString() + this._auxToString() + this._childString();
    };
    Url.prototype.segmentToString = function () { return this.path + this._matrixParamsToString(); };
    /** @internal */
    Url.prototype._auxToString = function () {
        return this.auxiliary.length > 0 ?
            ('(' + this.auxiliary.map(function (sibling) { return sibling.toString(); }).join('//') + ')') :
            '';
    };
    Url.prototype._matrixParamsToString = function () {
        if (isBlank(this.params)) {
            return '';
        }
        return ';' + serializeParams(this.params).join(';');
    };
    /** @internal */
    Url.prototype._childString = function () { return isPresent(this.child) ? ('/' + this.child.toString()) : ''; };
    return Url;
})();
exports.Url = Url;
var RootUrl = (function (_super) {
    __extends(RootUrl, _super);
    function RootUrl(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = null; }
        _super.call(this, path, child, auxiliary, params);
    }
    RootUrl.prototype.toString = function () {
        return this.path + this._auxToString() + this._childString() + this._queryParamsToString();
    };
    RootUrl.prototype.segmentToString = function () { return this.path + this._queryParamsToString(); };
    RootUrl.prototype._queryParamsToString = function () {
        if (isBlank(this.params)) {
            return '';
        }
        return '?' + serializeParams(this.params).join('&');
    };
    return RootUrl;
})(Url);
exports.RootUrl = RootUrl;
function pathSegmentsToUrl(pathSegments) {
    var url = new Url(pathSegments[pathSegments.length - 1]);
    for (var i = pathSegments.length - 2; i >= 0; i -= 1) {
        url = new Url(pathSegments[i], url);
    }
    return url;
}
exports.pathSegmentsToUrl = pathSegmentsToUrl;
var SEGMENT_RE = RegExpWrapper.create('^[^\\/\\(\\)\\?;=&#]+');
function matchUrlSegment(str) {
    var match = RegExpWrapper.firstMatch(SEGMENT_RE, str);
    return isPresent(match) ? match[0] : '';
}
var UrlParser = (function () {
    function UrlParser() {
    }
    UrlParser.prototype.peekStartsWith = function (str) { return StringWrapper.startsWith(this._remaining, str); };
    UrlParser.prototype.capture = function (str) {
        if (!StringWrapper.startsWith(this._remaining, str)) {
            throw new BaseException("Expected \"" + str + "\".");
        }
        this._remaining = this._remaining.substring(str.length);
    };
    UrlParser.prototype.parse = function (url) {
        this._remaining = url;
        if (url == '' || url == '/') {
            return new Url('');
        }
        return this.parseRoot();
    };
    // segment + (aux segments) + (query params)
    UrlParser.prototype.parseRoot = function () {
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        if (this.peekStartsWith(';')) {
            // TODO: should these params just be dropped?
            this.parseMatrixParams();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        var queryParams = null;
        if (this.peekStartsWith('?')) {
            queryParams = this.parseQueryParams();
        }
        return new RootUrl(path, child, aux, queryParams);
    };
    // segment + (matrix params) + (aux segments)
    UrlParser.prototype.parseSegment = function () {
        if (this._remaining.length == 0) {
            return null;
        }
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var matrixParams = null;
        if (this.peekStartsWith(';')) {
            matrixParams = this.parseMatrixParams();
        }
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        return new Url(path, child, aux, matrixParams);
    };
    UrlParser.prototype.parseQueryParams = function () {
        var params = {};
        this.capture('?');
        this.parseParam(params);
        while (this._remaining.length > 0 && this.peekStartsWith('&')) {
            this.capture('&');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseMatrixParams = function () {
        var params = {};
        while (this._remaining.length > 0 && this.peekStartsWith(';')) {
            this.capture(';');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseParam = function (params) {
        var key = matchUrlSegment(this._remaining);
        if (isBlank(key)) {
            return;
        }
        this.capture(key);
        var value = true;
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlSegment(this._remaining);
            if (isPresent(valueMatch)) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    };
    UrlParser.prototype.parseAuxiliaryRoutes = function () {
        var routes = [];
        this.capture('(');
        while (!this.peekStartsWith(')') && this._remaining.length > 0) {
            routes.push(this.parseSegment());
            if (this.peekStartsWith('//')) {
                this.capture('//');
            }
        }
        this.capture(')');
        return routes;
    };
    return UrlParser;
})();
exports.UrlParser = UrlParser;
exports.parser = new UrlParser();
function serializeParams(paramMap) {
    var params = [];
    if (isPresent(paramMap)) {
        StringMapWrapper.forEach(paramMap, function (value, key) {
            if (value == true) {
                params.push(key);
            }
            else {
                params.push(key + '=' + value);
            }
        });
    }
    return params;
}
exports.serializeParams = serializeParams;
var url_parser_1 = require('./url_parser');
var instruction_1 = require('./instruction');
var TouchMap = (function () {
    function TouchMap(map) {
        var _this = this;
        this.map = {};
        this.keys = {};
        if (isPresent(map)) {
            StringMapWrapper.forEach(map, function (value, key) {
                _this.map[key] = isPresent(value) ? value.toString() : null;
                _this.keys[key] = true;
            });
        }
    }
    TouchMap.prototype.get = function (key) {
        StringMapWrapper.delete(this.keys, key);
        return this.map[key];
    };
    TouchMap.prototype.getUnused = function () {
        var _this = this;
        var unused = StringMapWrapper.create();
        var keys = StringMapWrapper.keys(this.keys);
        keys.forEach(function (key) { return unused[key] = StringMapWrapper.get(_this.map, key); });
        return unused;
    };
    return TouchMap;
})();
function normalizeString(obj) {
    if (isBlank(obj)) {
        return null;
    }
    else {
        return obj.toString();
    }
}
var ContinuationSegment = (function () {
    function ContinuationSegment() {
        this.name = '';
    }
    ContinuationSegment.prototype.generate = function (params) { return ''; };
    ContinuationSegment.prototype.match = function (path) { return true; };
    return ContinuationSegment;
})();
var StaticSegment = (function () {
    function StaticSegment(path) {
        this.path = path;
        this.name = '';
    }
    StaticSegment.prototype.match = function (path) { return path == this.path; };
    StaticSegment.prototype.generate = function (params) { return this.path; };
    return StaticSegment;
})();
var DynamicSegment = (function () {
    function DynamicSegment(name) {
        this.name = name;
    }
    DynamicSegment.prototype.match = function (path) { return path.length > 0; };
    DynamicSegment.prototype.generate = function (params) {
        if (!StringMapWrapper.contains(params.map, this.name)) {
            throw new BaseException("Route generator for '" + this.name + "' was not included in parameters passed.");
        }
        return normalizeString(params.get(this.name));
    };
    return DynamicSegment;
})();
var StarSegment = (function () {
    function StarSegment(name) {
        this.name = name;
    }
    StarSegment.prototype.match = function (path) { return true; };
    StarSegment.prototype.generate = function (params) { return normalizeString(params.get(this.name)); };
    return StarSegment;
})();
var paramMatcher = /^:([^\/]+)$/g;
var wildcardMatcher = /^\*([^\/]+)$/g;
function parsePathString(route) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (StringWrapper.startsWith(route, "/")) {
        route = StringWrapper.substring(route, 1);
    }
    var segments = splitBySlash(route);
    var results = [];
    var specificity = 0;
    // The "specificity" of a path is used to determine which route is used when multiple routes match
    // a URL.
    // Static segments (like "/foo") are the most specific, followed by dynamic segments (like
    // "/:id"). Star segments
    // add no specificity. Segments at the start of the path are more specific than proceeding ones.
    // The code below uses place values to combine the different types of segments into a single
    // integer that we can
    // sort later. Each static segment is worth hundreds of points of specificity (10000, 9900, ...,
    // 200), and each
    // dynamic segment is worth single points of specificity (100, 99, ... 2).
    if (segments.length > 98) {
        throw new BaseException("'" + route + "' has more than the maximum supported number of segments.");
    }
    var limit = segments.length - 1;
    for (var i = 0; i <= limit; i++) {
        var segment = segments[i], match;
        if (isPresent(match = RegExpWrapper.firstMatch(paramMatcher, segment))) {
            results.push(new DynamicSegment(match[1]));
            specificity += (100 - i);
        }
        else if (isPresent(match = RegExpWrapper.firstMatch(wildcardMatcher, segment))) {
            results.push(new StarSegment(match[1]));
        }
        else if (segment == '...') {
            if (i < limit) {
                // TODO (matsko): setup a proper error here `
                throw new BaseException("Unexpected \"...\" before the end of the path for \"" + route + "\".");
            }
            results.push(new ContinuationSegment());
        }
        else {
            results.push(new StaticSegment(segment));
            specificity += 100 * (100 - i);
        }
    }
    var result = StringMapWrapper.create();
    StringMapWrapper.set(result, 'segments', results);
    StringMapWrapper.set(result, 'specificity', specificity);
    return result;
}
// this function is used to determine whether a route config path like `/foo/:id` collides with
// `/foo/:name`
function pathDslHash(segments) {
    return segments.map(function (segment) {
        if (segment instanceof StarSegment) {
            return '*';
        }
        else if (segment instanceof ContinuationSegment) {
            return '...';
        }
        else if (segment instanceof DynamicSegment) {
            return ':';
        }
        else if (segment instanceof StaticSegment) {
            return segment.path;
        }
    })
        .join('/');
}
function splitBySlash(url) {
    return url.split('/');
}
var RESERVED_CHARS = RegExpWrapper.create('//|\\(|\\)|;|\\?|=');
function assertPath(path) {
    if (StringWrapper.contains(path, '#')) {
        throw new BaseException("Path \"" + path + "\" should not include \"#\". Use \"HashLocationStrategy\" instead.");
    }
    var illegalCharacter = RegExpWrapper.firstMatch(RESERVED_CHARS, path);
    if (isPresent(illegalCharacter)) {
        throw new BaseException("Path \"" + path + "\" contains \"" + illegalCharacter[0] + "\" which is not allowed in a route config.");
    }
}
var PathMatch = (function () {
    function PathMatch(instruction, remaining, remainingAux) {
        this.instruction = instruction;
        this.remaining = remaining;
        this.remainingAux = remainingAux;
    }
    return PathMatch;
})();
exports.PathMatch = PathMatch;
// represents something like '/foo/:bar'
var PathRecognizer = (function () {
    // TODO: cache component instruction instances by params and by ParsedUrl instance
    function PathRecognizer(path, handler) {
        this.path = path;
        this.handler = handler;
        this.terminal = true;
        this._cache = new Map();
        assertPath(path);
        var parsed = parsePathString(path);
        this._segments = parsed['segments'];
        this.specificity = parsed['specificity'];
        this.hash = pathDslHash(this._segments);
        var lastSegment = this._segments[this._segments.length - 1];
        this.terminal = !(lastSegment instanceof ContinuationSegment);
    }
    PathRecognizer.prototype.recognize = function (beginningSegment) {
        var nextSegment = beginningSegment;
        var currentSegment;
        var positionalParams = {};
        var captured = [];
        for (var i = 0; i < this._segments.length; i += 1) {
            var segment = this._segments[i];
            currentSegment = nextSegment;
            if (segment instanceof ContinuationSegment) {
                break;
            }
            if (isPresent(currentSegment)) {
                captured.push(currentSegment.path);
                // the star segment consumes all of the remaining URL, including matrix params
                if (segment instanceof StarSegment) {
                    positionalParams[segment.name] = currentSegment.toString();
                    nextSegment = null;
                    break;
                }
                if (segment instanceof DynamicSegment) {
                    positionalParams[segment.name] = currentSegment.path;
                }
                else if (!segment.match(currentSegment.path)) {
                    return null;
                }
                nextSegment = currentSegment.child;
            }
            else if (!segment.match('')) {
                return null;
            }
        }
        if (this.terminal && isPresent(nextSegment)) {
            return null;
        }
        var urlPath = captured.join('/');
        var auxiliary;
        var instruction;
        var urlParams;
        var allParams;
        if (isPresent(currentSegment)) {
            // If this is the root component, read query params. Otherwise, read matrix params.
            var paramsSegment = beginningSegment instanceof url_parser_1.RootUrl ? beginningSegment : currentSegment;
            allParams = isPresent(paramsSegment.params) ?
                StringMapWrapper.merge(paramsSegment.params, positionalParams) :
                positionalParams;
            urlParams = url_parser_1.serializeParams(paramsSegment.params);
            auxiliary = currentSegment.auxiliary;
        }
        else {
            allParams = positionalParams;
            auxiliary = [];
            urlParams = [];
        }
        instruction = this._getInstruction(urlPath, urlParams, this, allParams);
        return new PathMatch(instruction, nextSegment, auxiliary);
    };
    PathRecognizer.prototype.generate = function (params) {
        var paramTokens = new TouchMap(params);
        var path = [];
        for (var i = 0; i < this._segments.length; i++) {
            var segment = this._segments[i];
            if (!(segment instanceof ContinuationSegment)) {
                path.push(segment.generate(paramTokens));
            }
        }
        var urlPath = path.join('/');
        var nonPositionalParams = paramTokens.getUnused();
        var urlParams = url_parser_1.serializeParams(nonPositionalParams);
        return this._getInstruction(urlPath, urlParams, this, params);
    };
    PathRecognizer.prototype._getInstruction = function (urlPath, urlParams, _recognizer, params) {
        var hashKey = urlPath + '?' + urlParams.join('?');
        if (this._cache.has(hashKey)) {
            return this._cache.get(hashKey);
        }
        var instruction = new instruction_1.ComponentInstruction_(urlPath, urlParams, _recognizer, params);
        this._cache.set(hashKey, instruction);
        return instruction;
    };
    return PathRecognizer;
})();
exports.PathRecognizer = PathRecognizer;
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var route_definition_1 = require('./route_definition');
exports.RouteDefinition = route_definition_1.RouteDefinition;
/**
 * The `RouteConfig` decorator defines routes for a given component.
 *
 * It takes an array of {@link RouteDefinition}s.
 */
var RouteConfig = (function () {
    function RouteConfig(configs) {
        this.configs = configs;
    }
    RouteConfig = __decorate([
        CONST()
    ], RouteConfig);
    return RouteConfig;
})();
exports.RouteConfig = RouteConfig;
/**
 * `Route` is a type of {@link RouteDefinition} used to route a path to a component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `as` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via the {@link ROUTE_DATA} token.
 *
 * ## Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/home', component: HomeCmp, as: 'HomeCmp' }
 * ])
 * class MyApp {}
 * ```
 */
var Route = (function () {
    function Route(_a) {
        var path = _a.path, component = _a.component, as = _a.as, data = _a.data;
        this.path = path;
        this.component = component;
        this.as = as;
        this.loader = null;
        this.redirectTo = null;
        this.data = data;
    }
    Route = __decorate([
        CONST()
    ], Route);
    return Route;
})();
exports.Route = Route;
/**
 * `AuxRoute` is a type of {@link RouteDefinition} used to define an auxiliary route.
 *
 * It takes an object with the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `as` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via the {@link ROUTE_DATA} token.
 *
 * ## Example
 * ```
 * import {RouteConfig, AuxRoute} from 'angular2/router';
 *
 * @RouteConfig([
 *   new AuxRoute({path: '/home', component: HomeCmp})
 * ])
 * class MyApp {}
 * ```
 */
var AuxRoute = (function () {
    function AuxRoute(_a) {
        var path = _a.path, component = _a.component, as = _a.as;
        this.data = null;
        // added next two properties to work around https://github.com/Microsoft/TypeScript/issues/4107
        this.loader = null;
        this.redirectTo = null;
        this.path = path;
        this.component = component;
        this.as = as;
    }
    AuxRoute = __decorate([
        CONST()
    ], AuxRoute);
    return AuxRoute;
})();
exports.AuxRoute = AuxRoute;
/**
 * `AsyncRoute` is a type of {@link RouteDefinition} used to route a path to an asynchronously
 * loaded component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `loader` is a function that returns a promise that resolves to a component.
 * - `as` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via the {@link ROUTE_DATA} token.
 *
 * ## Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/home', loader: () => Promise.resolve(MyLoadedCmp), as: 'MyLoadedCmp'}
 * ])
 * class MyApp {}
 * ```
 */
var AsyncRoute = (function () {
    function AsyncRoute(_a) {
        var path = _a.path, loader = _a.loader, as = _a.as, data = _a.data;
        this.path = path;
        this.loader = loader;
        this.as = as;
        this.data = data;
    }
    AsyncRoute = __decorate([
        CONST()
    ], AsyncRoute);
    return AsyncRoute;
})();
exports.AsyncRoute = AsyncRoute;
/**
 * `Redirect` is a type of {@link RouteDefinition} used to route a path to an asynchronously loaded
 * component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `redirectTo` is a string representing the new URL to be matched against.
 *
 * ## Example
 * ```
 * import {RouteConfig} from 'angular2/router';
 *
 * @RouteConfig([
 *   {path: '/', redirectTo: '/home'},
 *   {path: '/home', component: HomeCmp}
 * ])
 * class MyApp {}
 * ```
 */
var Redirect = (function () {
    function Redirect(_a) {
        var path = _a.path, redirectTo = _a.redirectTo;
        this.as = null;
        // added next property to work around https://github.com/Microsoft/TypeScript/issues/4107
        this.loader = null;
        this.data = null;
        this.path = path;
        this.redirectTo = redirectTo;
    }
    Redirect = __decorate([
        CONST()
    ], Redirect);
    return Redirect;
})();
exports.Redirect = Redirect;
var AsyncRouteHandler = (function () {
    function AsyncRouteHandler(_loader, data) {
        this._loader = _loader;
        this.data = data;
        /** @internal */
        this._resolvedComponent = null;
    }
    AsyncRouteHandler.prototype.resolveComponentType = function () {
        var _this = this;
        if (isPresent(this._resolvedComponent)) {
            return this._resolvedComponent;
        }
        return this._resolvedComponent = this._loader().then(function (componentType) {
            _this.componentType = componentType;
            return componentType;
        });
    };
    return AsyncRouteHandler;
})();
exports.AsyncRouteHandler = AsyncRouteHandler;
var SyncRouteHandler = (function () {
    function SyncRouteHandler(componentType, data) {
        this.componentType = componentType;
        this.data = data;
        /** @internal */
        this._resolvedComponent = null;
        this._resolvedComponent = PromiseWrapper.resolve(componentType);
    }
    SyncRouteHandler.prototype.resolveComponentType = function () { return this._resolvedComponent; };
    return SyncRouteHandler;
})();
exports.SyncRouteHandler = SyncRouteHandler;
var path_recognizer_1 = require('./path_recognizer');
var route_config_impl_1 = require('./route_config_impl');
var async_route_handler_1 = require('./async_route_handler');
var sync_route_handler_1 = require('./sync_route_handler');
var url_parser_1 = require('./url_parser');
/**
 * `RouteRecognizer` is responsible for recognizing routes for a single component.
 * It is consumed by `RouteRegistry`, which knows how to recognize an entire hierarchy of
 * components.
 */
var RouteRecognizer = (function () {
    function RouteRecognizer() {
        this.names = new Map();
        this.auxRoutes = new Map();
        // TODO: optimize this into a trie
        this.matchers = [];
        // TODO: optimize this into a trie
        this.redirects = [];
    }
    RouteRecognizer.prototype.config = function (config) {
        var handler;
        if (isPresent(config.as) && config.as[0].toUpperCase() != config.as[0]) {
            var suggestedAlias = config.as[0].toUpperCase() + config.as.substring(1);
            throw new BaseException("Route '" + config.path + "' with alias '" + config.as + "' does not begin with an uppercase letter. Route aliases should be CamelCase like '" + suggestedAlias + "'.");
        }
        if (config instanceof route_config_impl_1.AuxRoute) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
            var path = StringWrapper.startsWith(config.path, '/') ? config.path.substring(1) : config.path;
            var recognizer = new path_recognizer_1.PathRecognizer(config.path, handler);
            this.auxRoutes.set(path, recognizer);
            return recognizer.terminal;
        }
        if (config instanceof route_config_impl_1.Redirect) {
            this.redirects.push(new Redirector(config.path, config.redirectTo));
            return true;
        }
        if (config instanceof route_config_impl_1.Route) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
        }
        else if (config instanceof route_config_impl_1.AsyncRoute) {
            handler = new async_route_handler_1.AsyncRouteHandler(config.loader, config.data);
        }
        var recognizer = new path_recognizer_1.PathRecognizer(config.path, handler);
        this.matchers.forEach(function (matcher) {
            if (recognizer.hash == matcher.hash) {
                throw new BaseException("Configuration '" + config.path + "' conflicts with existing route '" + matcher.path + "'");
            }
        });
        this.matchers.push(recognizer);
        if (isPresent(config.as)) {
            this.names.set(config.as, recognizer);
        }
        return recognizer.terminal;
    };
    /**
     * Given a URL, returns a list of `RouteMatch`es, which are partial recognitions for some route.
     *
     */
    RouteRecognizer.prototype.recognize = function (urlParse) {
        var solutions = [];
        urlParse = this._redirect(urlParse);
        this.matchers.forEach(function (pathRecognizer) {
            var pathMatch = pathRecognizer.recognize(urlParse);
            if (isPresent(pathMatch)) {
                solutions.push(pathMatch);
            }
        });
        return solutions;
    };
    /** @internal */
    RouteRecognizer.prototype._redirect = function (urlParse) {
        for (var i = 0; i < this.redirects.length; i += 1) {
            var redirector = this.redirects[i];
            var redirectedUrl = redirector.redirect(urlParse);
            if (isPresent(redirectedUrl)) {
                return redirectedUrl;
            }
        }
        return urlParse;
    };
    RouteRecognizer.prototype.recognizeAuxiliary = function (urlParse) {
        var pathRecognizer = this.auxRoutes.get(urlParse.path);
        if (isBlank(pathRecognizer)) {
            return null;
        }
        return pathRecognizer.recognize(urlParse);
    };
    RouteRecognizer.prototype.hasRoute = function (name) { return this.names.has(name); };
    RouteRecognizer.prototype.generate = function (name, params) {
        var pathRecognizer = this.names.get(name);
        if (isBlank(pathRecognizer)) {
            return null;
        }
        return pathRecognizer.generate(params);
    };
    return RouteRecognizer;
})();
exports.RouteRecognizer = RouteRecognizer;
var Redirector = (function () {
    function Redirector(path, redirectTo) {
        this.segments = [];
        this.toSegments = [];
        if (StringWrapper.startsWith(path, '/')) {
            path = path.substring(1);
        }
        this.segments = path.split('/');
        if (StringWrapper.startsWith(redirectTo, '/')) {
            redirectTo = redirectTo.substring(1);
        }
        this.toSegments = redirectTo.split('/');
    }
    /**
     * Returns `null` or a `ParsedUrl` representing the new path to match
     */
    Redirector.prototype.redirect = function (urlParse) {
        for (var i = 0; i < this.segments.length; i += 1) {
            if (isBlank(urlParse)) {
                return null;
            }
            var segment = this.segments[i];
            if (segment != urlParse.path) {
                return null;
            }
            urlParse = urlParse.child;
        }
        for (var i = this.toSegments.length - 1; i >= 0; i -= 1) {
            var segment = this.toSegments[i];
            urlParse = new url_parser_1.Url(segment, urlParse);
        }
        return urlParse;
    };
    return Redirector;
})();
exports.Redirector = Redirector;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * `RouteParams` is an immutable map of parameters for the given route
 * based on the url matcher and optional parameters for that route.
 *
 * You can inject `RouteParams` into the constructor of a component to use it.
 *
 * ## Example
 *
 * ```
 * import {bootstrap, Component} from 'angular2/angular2';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, as: 'UserCmp'},
 * ])
 * class AppCmp {}
 *
 * @Component({ template: 'user: {{id}}' })
 * class UserCmp {
 *   string: id;
 *   constructor(params: RouteParams) {
 *     this.id = params.get('id');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var RouteParams = (function () {
    function RouteParams(params) {
        this.params = params;
    }
    RouteParams.prototype.get = function (param) { return normalizeBlank(StringMapWrapper.get(this.params, param)); };
    return RouteParams;
})();
exports.RouteParams = RouteParams;
/**
 * `Instruction` is a tree of {@link ComponentInstruction}s with all the information needed
 * to transition each component in the app to a given route, including all auxiliary routes.
 *
 * `Instruction`s can be created using {@link Router#generate}, and can be used to
 * perform route changes with {@link Router#navigateByInstruction}.
 *
 * ## Example
 *
 * ```
 * import {bootstrap, Component} from 'angular2/angular2';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   constructor(router: Router) {
 *     var instruction = router.generate(['/MyRoute']);
 *     router.navigateByInstruction(instruction);
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var Instruction = (function () {
    function Instruction(component, child, auxInstruction) {
        this.component = component;
        this.child = child;
        this.auxInstruction = auxInstruction;
    }
    /**
     * Returns a new instruction that shares the state of the existing instruction, but with
     * the given child {@link Instruction} replacing the existing child.
     */
    Instruction.prototype.replaceChild = function (child) {
        return new Instruction(this.component, child, this.auxInstruction);
    };
    return Instruction;
})();
exports.Instruction = Instruction;
/**
 * Represents a partially completed instruction during recognition that only has the
 * primary (non-aux) route instructions matched.
 *
 * `PrimaryInstruction` is an internal class used by `RouteRecognizer` while it's
 * figuring out where to navigate.
 */
var PrimaryInstruction = (function () {
    function PrimaryInstruction(component, child, auxUrls) {
        this.component = component;
        this.child = child;
        this.auxUrls = auxUrls;
    }
    return PrimaryInstruction;
})();
exports.PrimaryInstruction = PrimaryInstruction;
function stringifyInstruction(instruction) {
    return stringifyInstructionPath(instruction) + stringifyInstructionQuery(instruction);
}
exports.stringifyInstruction = stringifyInstruction;
function stringifyInstructionPath(instruction) {
    return instruction.component.urlPath + stringifyAux(instruction) +
        stringifyPrimary(instruction.child);
}
exports.stringifyInstructionPath = stringifyInstructionPath;
function stringifyInstructionQuery(instruction) {
    return instruction.component.urlParams.length > 0 ?
        ('?' + instruction.component.urlParams.join('&')) :
        '';
}
exports.stringifyInstructionQuery = stringifyInstructionQuery;
function stringifyPrimary(instruction) {
    if (isBlank(instruction)) {
        return '';
    }
    var params = instruction.component.urlParams.length > 0 ?
        (';' + instruction.component.urlParams.join(';')) :
        '';
    return '/' + instruction.component.urlPath + params + stringifyAux(instruction) +
        stringifyPrimary(instruction.child);
}
function stringifyAux(instruction) {
    var routes = [];
    StringMapWrapper.forEach(instruction.auxInstruction, function (auxInstruction, _) {
        routes.push(stringifyPrimary(auxInstruction));
    });
    if (routes.length > 0) {
        return '(' + routes.join('//') + ')';
    }
    return '';
}
/**
 * A `ComponentInstruction` represents the route state for a single component. An `Instruction` is
 * composed of a tree of these `ComponentInstruction`s.
 *
 * `ComponentInstructions` is a public API. Instances of `ComponentInstruction` are passed
 * to route lifecycle hooks, like {@link CanActivate}.
 *
 * `ComponentInstruction`s are [https://en.wikipedia.org/wiki/Hash_consing](hash consed). You should
 * never construct one yourself with "new." Instead, rely on {@link Router/PathRecognizer} to
 * construct `ComponentInstruction`s.
 *
 * You should not modify this object. It should be treated as immutable.
 */
var ComponentInstruction = (function () {
    function ComponentInstruction() {
        this.reuse = false;
    }
    Object.defineProperty(ComponentInstruction.prototype, "componentType", {
        /**
         * Returns the component type of the represented route, or `null` if this instruction
         * hasn't been resolved.
         */
        get: function () { return unimplemented(); },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(ComponentInstruction.prototype, "specificity", {
        /**
         * Returns the specificity of the route associated with this `Instruction`.
         */
        get: function () { return unimplemented(); },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(ComponentInstruction.prototype, "terminal", {
        /**
         * Returns `true` if the component type of this instruction has no child {@link RouteConfig},
         * or `false` if it does.
         */
        get: function () { return unimplemented(); },
        enumerable: true,
        configurable: true
    });
    ;
    return ComponentInstruction;
})();
exports.ComponentInstruction = ComponentInstruction;
var ComponentInstruction_ = (function (_super) {
    __extends(ComponentInstruction_, _super);
    function ComponentInstruction_(urlPath, urlParams, _recognizer, params) {
        if (params === void 0) { params = null; }
        _super.call(this);
        this._recognizer = _recognizer;
        this.urlPath = urlPath;
        this.urlParams = urlParams;
        this.params = params;
    }
    Object.defineProperty(ComponentInstruction_.prototype, "componentType", {
        get: function () { return this._recognizer.handler.componentType; },
        enumerable: true,
        configurable: true
    });
    ComponentInstruction_.prototype.resolveComponentType = function () { return this._recognizer.handler.resolveComponentType(); };
    Object.defineProperty(ComponentInstruction_.prototype, "specificity", {
        get: function () { return this._recognizer.specificity; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComponentInstruction_.prototype, "terminal", {
        get: function () { return this._recognizer.terminal; },
        enumerable: true,
        configurable: true
    });
    ComponentInstruction_.prototype.routeData = function () { return this._recognizer.handler.data; };
    return ComponentInstruction_;
})(ComponentInstruction);
exports.ComponentInstruction_ = ComponentInstruction_;
var route_config_decorator_1 = require('./route_config_decorator');
/**
 * Given a JS Object that represents... returns a corresponding Route, AsyncRoute, or Redirect
 */
function normalizeRouteConfig(config) {
    if (config instanceof route_config_decorator_1.Route || config instanceof route_config_decorator_1.Redirect || config instanceof route_config_decorator_1.AsyncRoute ||
        config instanceof route_config_decorator_1.AuxRoute) {
        return config;
    }
    if ((+!!config.component) + (+!!config.redirectTo) + (+!!config.loader) != 1) {
        throw new BaseException("Route config should contain exactly one \"component\", \"loader\", or \"redirectTo\" property.");
    }
    if (config.loader) {
        return new route_config_decorator_1.AsyncRoute({ path: config.path, loader: config.loader, as: config.as });
    }
    if (config.component) {
        if (typeof config.component == 'object') {
            var componentDefinitionObject = config.component;
            if (componentDefinitionObject.type == 'constructor') {
                return new route_config_decorator_1.Route({
                    path: config.path,
                    component: componentDefinitionObject.constructor,
                    as: config.as
                });
            }
            else if (componentDefinitionObject.type == 'loader') {
                return new route_config_decorator_1.AsyncRoute({ path: config.path, loader: componentDefinitionObject.loader, as: config.as });
            }
            else {
                throw new BaseException("Invalid component type \"" + componentDefinitionObject.type + "\". Valid types are \"constructor\" and \"loader\".");
            }
        }
        return new route_config_decorator_1.Route(config);
    }
    if (config.redirectTo) {
        return new route_config_decorator_1.Redirect({ path: config.path, redirectTo: config.redirectTo });
    }
    return config;
}
exports.normalizeRouteConfig = normalizeRouteConfig;
function assertComponentExists(component, path) {
    if (!isType(component)) {
        throw new BaseException("Component for route \"" + path + "\" is not defined, or is not a class.");
    }
}
exports.assertComponentExists = assertComponentExists;
var lifecycle_annotations_impl_1 = require('./lifecycle_annotations_impl');
function hasLifecycleHook(e, type) {
    if (!(type instanceof Type))
        return false;
    return e.name in type.prototype;
}
exports.hasLifecycleHook = hasLifecycleHook;
function getCanActivateHook(type) {
    var annotations = reflector.annotations(type);
    for (var i = 0; i < annotations.length; i += 1) {
        var annotation = annotations[i];
        if (annotation instanceof lifecycle_annotations_impl_1.CanActivate) {
            return annotation.fn;
        }
    }
    return null;
}
exports.getCanActivateHook = getCanActivateHook;
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
};
var route_recognizer_1 = require('./route_recognizer');
var instruction_1 = require('./instruction');
var route_config_impl_1 = require('./route_config_impl');
var angular2_1 = require('angular2/angular2');
var route_config_nomalizer_1 = require('./route_config_nomalizer');
var url_parser_1 = require('./url_parser');
var _resolveToNull = PromiseWrapper.resolve(null);
/**
 * The RouteRegistry holds route configurations for each component in an Angular app.
 * It is responsible for creating Instructions from URLs, and generating URLs based on route and
 * parameters.
 */
var RouteRegistry = (function () {
    function RouteRegistry() {
        this._rules = new Map();
    }
    /**
     * Given a component and a configuration object, add the route to this registry
     */
    RouteRegistry.prototype.config = function (parentComponent, config) {
        config = route_config_nomalizer_1.normalizeRouteConfig(config);
        // this is here because Dart type guard reasons
        if (config instanceof route_config_impl_1.Route) {
            route_config_nomalizer_1.assertComponentExists(config.component, config.path);
        }
        else if (config instanceof route_config_impl_1.AuxRoute) {
            route_config_nomalizer_1.assertComponentExists(config.component, config.path);
        }
        var recognizer = this._rules.get(parentComponent);
        if (isBlank(recognizer)) {
            recognizer = new route_recognizer_1.RouteRecognizer();
            this._rules.set(parentComponent, recognizer);
        }
        var terminal = recognizer.config(config);
        if (config instanceof route_config_impl_1.Route) {
            if (terminal) {
                assertTerminalComponent(config.component, config.path);
            }
            else {
                this.configFromComponent(config.component);
            }
        }
    };
    /**
     * Reads the annotations of a component and configures the registry based on them
     */
    RouteRegistry.prototype.configFromComponent = function (component) {
        var _this = this;
        if (!isType(component)) {
            return;
        }
        // Don't read the annotations from a type more than once –
        // this prevents an infinite loop if a component routes recursively.
        if (this._rules.has(component)) {
            return;
        }
        var annotations = reflector.annotations(component);
        if (isPresent(annotations)) {
            for (var i = 0; i < annotations.length; i++) {
                var annotation = annotations[i];
                if (annotation instanceof route_config_impl_1.RouteConfig) {
                    var routeCfgs = annotation.configs;
                    routeCfgs.forEach(function (config) { return _this.config(component, config); });
                }
            }
        }
    };
    /**
     * Given a URL and a parent component, return the most specific instruction for navigating
     * the application into the state specified by the url
     */
    RouteRegistry.prototype.recognize = function (url, parentComponent) {
        var parsedUrl = url_parser_1.parser.parse(url);
        return this._recognize(parsedUrl, parentComponent);
    };
    RouteRegistry.prototype._recognize = function (parsedUrl, parentComponent) {
        var _this = this;
        return this._recognizePrimaryRoute(parsedUrl, parentComponent)
            .then(function (instruction) {
            return _this._completeAuxiliaryRouteMatches(instruction, parentComponent);
        });
    };
    RouteRegistry.prototype._recognizePrimaryRoute = function (parsedUrl, parentComponent) {
        var _this = this;
        var componentRecognizer = this._rules.get(parentComponent);
        if (isBlank(componentRecognizer)) {
            return _resolveToNull;
        }
        // Matches some beginning part of the given URL
        var possibleMatches = componentRecognizer.recognize(parsedUrl);
        var matchPromises = possibleMatches.map(function (candidate) { return _this._completePrimaryRouteMatch(candidate); });
        return PromiseWrapper.all(matchPromises).then(mostSpecific);
    };
    RouteRegistry.prototype._completePrimaryRouteMatch = function (partialMatch) {
        var _this = this;
        var instruction = partialMatch.instruction;
        return instruction.resolveComponentType().then(function (componentType) {
            _this.configFromComponent(componentType);
            if (instruction.terminal) {
                return new instruction_1.PrimaryInstruction(instruction, null, partialMatch.remainingAux);
            }
            return _this._recognizePrimaryRoute(partialMatch.remaining, componentType)
                .then(function (childInstruction) {
                if (isBlank(childInstruction)) {
                    return null;
                }
                else {
                    return new instruction_1.PrimaryInstruction(instruction, childInstruction, partialMatch.remainingAux);
                }
            });
        });
    };
    RouteRegistry.prototype._completeAuxiliaryRouteMatches = function (instruction, parentComponent) {
        var _this = this;
        if (isBlank(instruction)) {
            return _resolveToNull;
        }
        var componentRecognizer = this._rules.get(parentComponent);
        var auxInstructions = {};
        var promises = instruction.auxUrls.map(function (auxSegment) {
            var match = componentRecognizer.recognizeAuxiliary(auxSegment);
            if (isBlank(match)) {
                return _resolveToNull;
            }
            return _this._completePrimaryRouteMatch(match).then(function (auxInstruction) {
                if (isPresent(auxInstruction)) {
                    return _this._completeAuxiliaryRouteMatches(auxInstruction, parentComponent)
                        .then(function (finishedAuxRoute) {
                        auxInstructions[auxSegment.path] = finishedAuxRoute;
                    });
                }
            });
        });
        return PromiseWrapper.all(promises).then(function (_) {
            if (isBlank(instruction.child)) {
                return new instruction_1.Instruction(instruction.component, null, auxInstructions);
            }
            return _this._completeAuxiliaryRouteMatches(instruction.child, instruction.component.componentType)
                .then(function (completeChild) {
                return new instruction_1.Instruction(instruction.component, completeChild, auxInstructions);
            });
        });
    };
    /**
     * Given a normalized list with component names and params like: `['user', {id: 3 }]`
     * generates a url with a leading slash relative to the provided `parentComponent`.
     */
    RouteRegistry.prototype.generate = function (linkParams, parentComponent) {
        var segments = [];
        var componentCursor = parentComponent;
        var lastInstructionIsTerminal = false;
        for (var i = 0; i < linkParams.length; i += 1) {
            var segment = linkParams[i];
            if (isBlank(componentCursor)) {
                throw new BaseException("Could not find route named \"" + segment + "\".");
            }
            if (!isString(segment)) {
                throw new BaseException("Unexpected segment \"" + segment + "\" in link DSL. Expected a string.");
            }
            else if (segment == '' || segment == '.' || segment == '..') {
                throw new BaseException("\"" + segment + "/\" is only allowed at the beginning of a link DSL.");
            }
            var params = {};
            if (i + 1 < linkParams.length) {
                var nextSegment = linkParams[i + 1];
                if (isStringMap(nextSegment)) {
                    params = nextSegment;
                    i += 1;
                }
            }
            var componentRecognizer = this._rules.get(componentCursor);
            if (isBlank(componentRecognizer)) {
                throw new BaseException("Component \"" + getTypeNameForDebugging(componentCursor) + "\" has no route config.");
            }
            var response = componentRecognizer.generate(segment, params);
            if (isBlank(response)) {
                throw new BaseException("Component \"" + getTypeNameForDebugging(componentCursor) + "\" has no route named \"" + segment + "\".");
            }
            segments.push(response);
            componentCursor = response.componentType;
            lastInstructionIsTerminal = response.terminal;
        }
        var instruction = null;
        if (!lastInstructionIsTerminal) {
            instruction = this._generateRedirects(componentCursor);
            if (isPresent(instruction)) {
                var lastInstruction = instruction;
                while (isPresent(lastInstruction.child)) {
                    lastInstruction = lastInstruction.child;
                }
                lastInstructionIsTerminal = lastInstruction.component.terminal;
            }
            if (isPresent(componentCursor) && !lastInstructionIsTerminal) {
                throw new BaseException("Link \"" + ListWrapper.toJSON(linkParams) + "\" does not resolve to a terminal or async instruction.");
            }
        }
        while (segments.length > 0) {
            instruction = new instruction_1.Instruction(segments.pop(), instruction, {});
        }
        return instruction;
    };
    // if the child includes a redirect like : "/" -> "/something",
    // we want to honor that redirection when creating the link
    RouteRegistry.prototype._generateRedirects = function (componentCursor) {
        if (isBlank(componentCursor)) {
            return null;
        }
        var componentRecognizer = this._rules.get(componentCursor);
        if (isBlank(componentRecognizer)) {
            return null;
        }
        for (var i = 0; i < componentRecognizer.redirects.length; i += 1) {
            var redirect = componentRecognizer.redirects[i];
            // we only handle redirecting from an empty segment
            if (redirect.segments.length == 1 && redirect.segments[0] == '') {
                var toSegments = url_parser_1.pathSegmentsToUrl(redirect.toSegments);
                var matches = componentRecognizer.recognize(toSegments);
                var primaryInstruction = ListWrapper.maximum(matches, function (match) { return match.instruction.specificity; });
                if (isPresent(primaryInstruction)) {
                    var child = this._generateRedirects(primaryInstruction.instruction.componentType);
                    return new instruction_1.Instruction(primaryInstruction.instruction, child, {});
                }
                return null;
            }
        }
        return null;
    };
    RouteRegistry = __decorate([
        angular2_1.Injectable()
    ], RouteRegistry);
    return RouteRegistry;
})();
exports.RouteRegistry = RouteRegistry;
/*
 * Given a list of instructions, returns the most specific instruction
 */
function mostSpecific(instructions) {
    return ListWrapper.maximum(instructions, function (instruction) { return instruction.component.specificity; });
}
function assertTerminalComponent(component, path) {
    if (!isType(component)) {
        return;
    }
    var annotations = reflector.annotations(component);
    if (isPresent(annotations)) {
        for (var i = 0; i < annotations.length; i++) {
            var annotation = annotations[i];
            if (annotation instanceof route_config_impl_1.RouteConfig) {
                throw new BaseException("Child routes are not allowed for \"" + path + "\". Use \"...\" on the parent's route path.");
            }
        }
    }
}
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var instruction_1 = require('./instruction');
var route_lifecycle_reflector_1 = require('./route_lifecycle_reflector');
var _resolveToTrue = PromiseWrapper.resolve(true);
var _resolveToFalse = PromiseWrapper.resolve(false);
/**
 * The `Router` is responsible for mapping URLs to components.
 *
 * You can see the state of the router by inspecting the read-only field `router.navigating`.
 * This may be useful for showing a spinner, for instance.
 *
 * ## Concepts
 *
 * Routers and component instances have a 1:1 correspondence.
 *
 * The router holds reference to a number of {@link RouterOutlet}.
 * An outlet is a placeholder that the router dynamically fills in depending on the current URL.
 *
 * When the router navigates from a URL, it must first recognize it and serialize it into an
 * `Instruction`.
 * The router uses the `RouteRegistry` to get an `Instruction`.
 */
var Router = (function () {
    function Router(registry, parent, hostComponent) {
        this.registry = registry;
        this.parent = parent;
        this.hostComponent = hostComponent;
        this.navigating = false;
        this._currentInstruction = null;
        this._currentNavigation = _resolveToTrue;
        this._outlet = null;
        this._auxRouters = new Map();
        this._subject = new EventEmitter();
    }
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.childRouter = function (hostComponent) {
        return this._childRouter = new ChildRouter(this, hostComponent);
    };
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.auxRouter = function (hostComponent) { return new ChildRouter(this, hostComponent); };
    /**
     * Register an outlet to notified of primary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerPrimaryOutlet = function (outlet) {
        if (isPresent(outlet.name)) {
            throw new BaseException("registerAuxOutlet expects to be called with an unnamed outlet.");
        }
        this._outlet = outlet;
        if (isPresent(this._currentInstruction)) {
            return this.commit(this._currentInstruction, false);
        }
        return _resolveToTrue;
    };
    /**
     * Register an outlet to notified of auxiliary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerAuxOutlet = function (outlet) {
        var outletName = outlet.name;
        if (isBlank(outletName)) {
            throw new BaseException("registerAuxOutlet expects to be called with an outlet with a name.");
        }
        // TODO...
        // what is the host of an aux route???
        var router = this.auxRouter(this.hostComponent);
        this._auxRouters.set(outletName, router);
        router._outlet = outlet;
        var auxInstruction;
        if (isPresent(this._currentInstruction) &&
            isPresent(auxInstruction = this._currentInstruction.auxInstruction[outletName])) {
            return router.commit(auxInstruction);
        }
        return _resolveToTrue;
    };
    /**
     * Given an instruction, returns `true` if the instruction is currently active,
     * otherwise `false`.
     */
    Router.prototype.isRouteActive = function (instruction) {
        var router = this;
        while (isPresent(router.parent) && isPresent(instruction.child)) {
            router = router.parent;
            instruction = instruction.child;
        }
        return isPresent(this._currentInstruction) &&
            this._currentInstruction.component == instruction.component;
    };
    /**
     * Dynamically update the routing configuration and trigger a navigation.
     *
     * # Usage
     *
     * ```
     * router.config([
     *   { 'path': '/', 'component': IndexComp },
     *   { 'path': '/user/:id', 'component': UserComp },
     * ]);
     * ```
     */
    Router.prototype.config = function (definitions) {
        var _this = this;
        definitions.forEach(function (routeDefinition) { _this.registry.config(_this.hostComponent, routeDefinition); });
        return this.renavigate();
    };
    /**
     * Navigate based on the provided Route Link DSL. It's preferred to navigate with this method
     * over `navigateByUrl`.
     *
     * # Usage
     *
     * This method takes an array representing the Route Link DSL:
     * ```
     * ['./MyCmp', {param: 3}]
     * ```
     * See the {@link RouterLink} directive for more.
     */
    Router.prototype.navigate = function (linkParams) {
        var instruction = this.generate(linkParams);
        return this.navigateByInstruction(instruction, false);
    };
    /**
     * Navigate to a URL. Returns a promise that resolves when navigation is complete.
     * It's preferred to navigate with `navigate` instead of this method, since URLs are more brittle.
     *
     * If the given URL begins with a `/`, router will navigate absolutely.
     * If the given URL does not begin with `/`, the router will navigate relative to this component.
     */
    Router.prototype.navigateByUrl = function (url, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this.lastNavigationAttempt = url;
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this.recognize(url).then(function (instruction) {
                if (isBlank(instruction)) {
                    return false;
                }
                return _this._navigate(instruction, _skipLocationChange);
            }));
        });
    };
    /**
     * Navigate via the provided instruction. Returns a promise that resolves when navigation is
     * complete.
     */
    Router.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        if (isBlank(instruction)) {
            return _resolveToFalse;
        }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this._navigate(instruction, _skipLocationChange));
        });
    };
    /** @internal */
    Router.prototype._navigate = function (instruction, _skipLocationChange) {
        var _this = this;
        return this._settleInstruction(instruction)
            .then(function (_) { return _this._canReuse(instruction); })
            .then(function (_) { return _this._canActivate(instruction); })
            .then(function (result) {
            if (!result) {
                return false;
            }
            return _this._canDeactivate(instruction)
                .then(function (result) {
                if (result) {
                    return _this.commit(instruction, _skipLocationChange)
                        .then(function (_) {
                        _this._emitNavigationFinish(instruction_1.stringifyInstruction(instruction));
                        return true;
                    });
                }
            });
        });
    };
    // TODO(btford): it'd be nice to remove this method as part of cleaning up the traversal logic
    // Since refactoring `Router.generate` to return an instruction rather than a string, it's not
    // guaranteed that the `componentType`s for the terminal async routes have been loaded by the time
    // we begin navigation. The method below simply traverses instructions and resolves any components
    // for which `componentType` is not present
    /** @internal */
    Router.prototype._settleInstruction = function (instruction) {
        var _this = this;
        var unsettledInstructions = [];
        if (isBlank(instruction.component.componentType)) {
            unsettledInstructions.push(instruction.component.resolveComponentType().then(function (type) { _this.registry.configFromComponent(type); }));
        }
        if (isPresent(instruction.child)) {
            unsettledInstructions.push(this._settleInstruction(instruction.child));
        }
        StringMapWrapper.forEach(instruction.auxInstruction, function (instruction, _) {
            unsettledInstructions.push(_this._settleInstruction(instruction));
        });
        return PromiseWrapper.all(unsettledInstructions);
    };
    Router.prototype._emitNavigationFinish = function (url) { ObservableWrapper.callNext(this._subject, url); };
    Router.prototype._afterPromiseFinishNavigating = function (promise) {
        var _this = this;
        return PromiseWrapper.catchError(promise.then(function (_) { return _this._finishNavigating(); }), function (err) {
            _this._finishNavigating();
            throw err;
        });
    };
    /*
     * Recursively set reuse flags
     */
    /** @internal */
    Router.prototype._canReuse = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToFalse;
        }
        return this._outlet.canReuse(instruction.component)
            .then(function (result) {
            instruction.component.reuse = result;
            if (result && isPresent(_this._childRouter) && isPresent(instruction.child)) {
                return _this._childRouter._canReuse(instruction.child);
            }
        });
    };
    Router.prototype._canActivate = function (nextInstruction) {
        return canActivateOne(nextInstruction, this._currentInstruction);
    };
    Router.prototype._canDeactivate = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToTrue;
        }
        var next;
        var childInstruction = null;
        var reuse = false;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
            reuse = instruction.component.reuse;
        }
        if (reuse) {
            next = _resolveToTrue;
        }
        else {
            next = this._outlet.canDeactivate(componentInstruction);
        }
        // TODO: aux route lifecycle hooks
        return next.then(function (result) {
            if (result == false) {
                return false;
            }
            if (isPresent(_this._childRouter)) {
                return _this._childRouter._canDeactivate(childInstruction);
            }
            return true;
        });
    };
    /**
     * Updates this router and all descendant routers according to the given instruction
     */
    Router.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        this._currentInstruction = instruction;
        var next = _resolveToTrue;
        if (isPresent(this._outlet)) {
            var componentInstruction = instruction.component;
            if (componentInstruction.reuse) {
                next = this._outlet.reuse(componentInstruction);
            }
            else {
                next =
                    this.deactivate(instruction).then(function (_) { return _this._outlet.activate(componentInstruction); });
            }
            if (isPresent(instruction.child)) {
                next = next.then(function (_) {
                    if (isPresent(_this._childRouter)) {
                        return _this._childRouter.commit(instruction.child);
                    }
                });
            }
        }
        var promises = [];
        this._auxRouters.forEach(function (router, name) { promises.push(router.commit(instruction.auxInstruction[name])); });
        return next.then(function (_) { return PromiseWrapper.all(promises); });
    };
    /** @internal */
    Router.prototype._startNavigating = function () { this.navigating = true; };
    /** @internal */
    Router.prototype._finishNavigating = function () { this.navigating = false; };
    /**
     * Subscribe to URL updates from the router
     */
    Router.prototype.subscribe = function (onNext) {
        return ObservableWrapper.subscribe(this._subject, onNext);
    };
    /**
     * Removes the contents of this router's outlet and all descendant outlets
     */
    Router.prototype.deactivate = function (instruction) {
        var _this = this;
        var childInstruction = null;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
        }
        var next = _resolveToTrue;
        if (isPresent(this._childRouter)) {
            next = this._childRouter.deactivate(childInstruction);
        }
        if (isPresent(this._outlet)) {
            next = next.then(function (_) { return _this._outlet.deactivate(componentInstruction); });
        }
        // TODO: handle aux routes
        return next;
    };
    /**
     * Given a URL, returns an instruction representing the component graph
     */
    Router.prototype.recognize = function (url) {
        return this.registry.recognize(url, this.hostComponent);
    };
    /**
     * Navigates to either the last URL successfully navigated to, or the last URL requested if the
     * router has yet to successfully navigate.
     */
    Router.prototype.renavigate = function () {
        if (isBlank(this.lastNavigationAttempt)) {
            return this._currentNavigation;
        }
        return this.navigateByUrl(this.lastNavigationAttempt);
    };
    /**
     * Generate a URL from a component name and optional map of parameters. The URL is relative to the
     * app's base href.
     */
    Router.prototype.generate = function (linkParams) {
        var normalizedLinkParams = splitAndFlattenLinkParams(linkParams);
        var first = ListWrapper.first(normalizedLinkParams);
        var rest = ListWrapper.slice(normalizedLinkParams, 1);
        var router = this;
        // The first segment should be either '.' (generate from parent) or '' (generate from root).
        // When we normalize above, we strip all the slashes, './' becomes '.' and '/' becomes ''.
        if (first == '') {
            while (isPresent(router.parent)) {
                router = router.parent;
            }
        }
        else if (first == '..') {
            router = router.parent;
            while (ListWrapper.first(rest) == '..') {
                rest = ListWrapper.slice(rest, 1);
                router = router.parent;
                if (isBlank(router)) {
                    throw new BaseException("Link \"" + ListWrapper.toJSON(linkParams) + "\" has too many \"../\" segments.");
                }
            }
        }
        else if (first != '.') {
            throw new BaseException("Link \"" + ListWrapper.toJSON(linkParams) + "\" must start with \"/\", \"./\", or \"../\"");
        }
        if (rest[rest.length - 1] == '') {
            rest.pop();
        }
        if (rest.length < 1) {
            var msg = "Link \"" + ListWrapper.toJSON(linkParams) + "\" must include a route name.";
            throw new BaseException(msg);
        }
        // TODO: structural cloning and whatnot
        var url = [];
        var parent = router.parent;
        while (isPresent(parent)) {
            url.unshift(parent._currentInstruction);
            parent = parent.parent;
        }
        var nextInstruction = this.registry.generate(rest, router.hostComponent);
        while (url.length > 0) {
            nextInstruction = url.pop().replaceChild(nextInstruction);
        }
        return nextInstruction;
    };
    return Router;
})();
exports.Router = Router;
var RootRouter = (function (_super) {
    __extends(RootRouter, _super);
    function RootRouter(registry, location, primaryComponent) {
        var _this = this;
        _super.call(this, registry, null, primaryComponent);
        this._location = location;
        this._location.subscribe(function (change) {
            return _this.navigateByUrl(change['url'], isPresent(change['pop']));
        });
        this.registry.configFromComponent(primaryComponent);
        this.navigateByUrl(location.path());
    }
    RootRouter.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        var emitPath = instruction_1.stringifyInstructionPath(instruction);
        var emitQuery = instruction_1.stringifyInstructionQuery(instruction);
        if (emitPath.length > 0) {
            emitPath = '/' + emitPath;
        }
        var promise = _super.prototype.commit.call(this, instruction);
        if (!_skipLocationChange) {
            promise = promise.then(function (_) { _this._location.go(emitPath, emitQuery); });
        }
        return promise;
    };
    return RootRouter;
})(Router);
exports.RootRouter = RootRouter;
var ChildRouter = (function (_super) {
    __extends(ChildRouter, _super);
    function ChildRouter(parent, hostComponent) {
        _super.call(this, parent.registry, parent, hostComponent);
        this.parent = parent;
    }
    ChildRouter.prototype.navigateByUrl = function (url, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByUrl(url, _skipLocationChange);
    };
    ChildRouter.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByInstruction(instruction, _skipLocationChange);
    };
    return ChildRouter;
})(Router);
/*
 * Given: ['/a/b', {c: 2}]
 * Returns: ['', 'a', 'b', {c: 2}]
 */
var SLASH = new RegExp('/');
function splitAndFlattenLinkParams(linkParams) {
    return ListWrapper.reduce(linkParams, function (accumulation, item) {
        if (isString(item)) {
            return accumulation.concat(StringWrapper.split(item, SLASH));
        }
        accumulation.push(item);
        return accumulation;
    }, []);
}
function canActivateOne(nextInstruction, prevInstruction) {
    var next = _resolveToTrue;
    if (isPresent(nextInstruction.child)) {
        next = canActivateOne(nextInstruction.child, isPresent(prevInstruction) ? prevInstruction.child : null);
    }
    return next.then(function (result) {
        if (result == false) {
            return false;
        }
        if (nextInstruction.component.reuse) {
            return true;
        }
        var hook = route_lifecycle_reflector_1.getCanActivateHook(nextInstruction.component.componentType);
        if (isPresent(hook)) {
            return hook(nextInstruction.component, isPresent(prevInstruction) ? prevInstruction.component : null);
        }
        return true;
    });
}


  //TODO: this is a hack to replace the exiting implementation at run-time
  exports.getCanActivateHook = function (directiveName) {
    var factory = $$directiveIntrospector.getTypeByName(directiveName);
    return factory && factory.$canActivate && function (next, prev) {
      return $injector.invoke(factory.$canActivate, null, {
        $nextInstruction: next,
        $prevInstruction: prev
      });
    };
  };

  // This hack removes assertions about the type of the "component"
  // property in a route config
  exports.assertComponentExists = function () {};

  angular.stringifyInstruction = exports.stringifyInstruction;

  var RouteRegistry = exports.RouteRegistry;
  var RootRouter = exports.RootRouter;

  var registry = new RouteRegistry();
  var location = new Location();

  $$directiveIntrospector(function (name, factory) {
    if (angular.isArray(factory.$routeConfig)) {
      factory.$routeConfig.forEach(function (config) {
        registry.config(name, config);
      });
    }
  });

  // Because Angular 1 has no notion of a root component, we use an object with unique identity
  // to represent this.
  var ROOT_COMPONENT_OBJECT = new Object();

  var router = new RootRouter(registry, location, ROOT_COMPONENT_OBJECT);
  $rootScope.$watch(function () { return $location.path(); }, function (path) {
    if (router.lastNavigationAttempt !== path) {
      router.navigateByUrl(path);
    }
  });

  router.subscribe(function () {
    $rootScope.$broadcast('$routeChangeSuccess', {});
  });

  return router;
}

}());
