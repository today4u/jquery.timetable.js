var gulp         = require('gulp');
var uglify       = require('gulp-uglify');
var less         = require('gulp-less');
var minifyCss    = require('gulp-minify-css');
var rename       = require('gulp-rename');


gulp.task('less', function() {
    return gulp.src('css/src/jquery.timetable.less')
        .pipe(less())
        .pipe(gulp.dest('css/dist/'))
        .pipe(minifyCss())
        .pipe(rename({extname: '.min.css'}))
        .pipe(gulp.dest('css/dist/'));
});

gulp.task('js', function() {
    return gulp.src('js/jquery.timetable.js')
          .pipe(rename('jquery.timetable.min.js'))
          .pipe(uglify())
          .pipe(gulp.dest('js/'));
});


gulp.task('default',['less','js']);
