var _ = require('lodash');
var Role = require('./role.base');
var State = require('./state');

var role = new Role();
role.addState(new State(
    'initial', {
        'to2': function (c) {
            "use strict";
            return c.a == 'next';
        }
    }
));
role.addState(new State(
    'second', {
        'toEnd': function (c) {
            "use strict";
            return c.a == 'end';

        }
    }
));
role.states.second = {
    name: 'final',
};

