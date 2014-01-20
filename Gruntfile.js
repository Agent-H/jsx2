module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      build: {
        files: {
          'build/<%= pkg.name %>-<%= pkg.version %>.js': ['lib/index.js'],
        },
        options: {
          standalone: '<%= pkg.name %>',
          bare: true
        }
      }
    },

    clean: {
      build: {
        src: ["build/"]
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('build', ['clean:build', 'browserify']);
};
