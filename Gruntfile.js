'use strict';

var fs = require("fs");
var path = require("path");

var getPrivateSettings = function(grunt) {
    var location = "./settings.js";
    if (!grunt.file.exists(location)) {
        console.log("Can't find ./settings.js, setting up...");

        var settingsFile =
        "module.exports = {\n" +
        "    screeps: {\n" +
        "        options: {\n" +
        "            email: null,\n" +
        "            settings: null,\n" +
        "            branch: \"default\"\n" +
        "        }\n" +
        "    }\n" +
        "};";

        grunt.file.write(location, settingsFile);
    } else {
        return require(location);
    }
};

module.exports = function(grunt) {

    grunt.loadTasks('tasks');
    grunt.loadNpmTasks('grunt-blanket');
    grunt.loadNpmTasks('grunt-codeclimate-reporter');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        clean: {
            deploy: ['build'],
            test: ['coverage', 'lib-cov'],
        },
        codeclimate: {
            options: {
                src: 'coverage/lcov.info'
            }
        },
        copy: {
            coverage: {
                expand: true,
                src: ['room1/**.test.js', 'lib/mocks/**'],
                dot: true,
                dest: 'lib-cov/'
            },
            deploy: {
                expand: true,
                flatten: true,
                src: ['room1/**'],
                dest: 'build/deploy'
            }
        },
        coveralls: {
            options: {
                force: true
            },
            coverage: {
                src: 'coverage/lcov.info'
            }
        },
        mochaTest: {
            test: {
                src: 'room1/**/*test.js',
                options: {
                    slow: 10
                }
            },
        },
        screeps: {
            options: {},
            dist: {
                src: ['build/deploy/*.js']
            }
        },
    });

    grunt.config.merge(getPrivateSettings(grunt));

    grunt.task.registerTask( [
        'clean:deploy',
        'copy:deploy',
        // 'eslint-mapper'
    ]);

    grunt.task.registerTask('check', [
        'mochaTest:test'
    ]);

    grunt.task.registerTask('deploy', [
        'screeps'
    ]);

    grunt.task.registerTask('setup', [
    ]);

    grunt.task.registerTask('test', [
        'clean:test',
        // 'blanket',
        'copy:coverage',
        'mochaTest',
    ]);

    grunt.task.registerTask('travis', [
        'clean:test',
        // 'blanket',
        'copy:coverage',
        'mochaTest:test',
        'mochaTest:coverage',
        'coveralls',
        'codeclimate',
        'run'
    ]);

    grunt.task.registerTask('default', [
        'test'
    ]);
};