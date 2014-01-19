module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    //lib/runtime.js --bare -s react_tpl -o build/react_templates_runtime-0.0.0.js
    browserify: {
      runtime: {
        files: {
          'build/<%= pkg.name %>-runtime-<%= pkg.version %>.js': ['lib/runtime.js'],
        },
        options: {
          standalone: '<%= pkg.name %>',
          bare: true
        }
      },
      standalone: {
        files: {
          'build/<%= pkg.name %>-standalone-<%= pkg.version %>.js': ['lib/index.js'],
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
