var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {
	    if(creep.carry.energy == 0 || creep.memory.goal =='fill') {
	        creep.memory.goal='fill';
            var sources = creep.room.find(FIND_SOURCES);
            if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0]);
            }
            if (creep.carry.energy == creep.carryCapacity) {
                creep.memory.action='upgrade';
            }
        }
        else {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
            if (creep.carry.energy == 0) {
                creep.memory.action = 'fill';
            }
        }
	}
};

module.exports = roleUpgrader;