var gulp = require('gulp');
var concat = require('gulp-concat');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var ngTemplates = require('gulp-ng-templates');
var sourcemaps = require('gulp-sourcemaps');
var headerfooter = require('gulp-headerfooter');

gulp.task('default', [
    'build','deps',
    'html', 'style',
    'connect', 'templates'
    ], function() {

    gulp.watch([
        './app/**/*.js',
        './app/**/*.html',
        './views/index.html',
        './lib/*.js'
    ], ['build', 'html', 'templates', 'deps']);
});

gulp.task('deps', function() {
    return gulp.src([
        'node_modules/@angular/router/angular1/angular_1_router.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(concat('dependencies.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('build', function() {
    return gulp.src([
        './app/**/*.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(concat('bundle.js'))
    //.pipe(headerfooter.header("(function() {\n"))
    //.pipe(headerfooter.footer("}());\n"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('html', function() {
    return gulp.src([
        './views/index.html'
    ])
    .pipe(gulp.dest('./dist/'));
});

gulp.task('style', function() {
    return gulp.src([
        'node_modules/bootstrap/dist/css/bootstrap.css'
    ])
    .pipe(gulp.dest('./dist/'));
});

gulp.task('connect', function() {
  connect.server({
    root: 'dist',
    port: 8080
  });
});

gulp.task('templates', function () {
    return gulp.src([
        'app/**/**.html'
    ])
    .pipe(ngTemplates({
        filename: 'templates.js',
        module: 'app.templates',
        path: function (path, base) {
            return path.replace(base, '');
        }
    }))
    .pipe(gulp.dest('./dist/'));
});
