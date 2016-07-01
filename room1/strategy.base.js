class Strategy {
    constructor(name) {
        this.name = (name ? name : this.constructor.name);
    }
    
    clearMemory(creep) {
        console.log("base clear", this.name, creep);
    }
}


class Extended extends Strategy {
    constructor(name) {
        super(name);
    }
    clearMemory(creep) {
        super.clearMemory(creep);
        console.log("extend clear", this.name,creep);
    }
    
}

new Strategy('base').clearMemory('c');
new Extended('extended').clearMemory('d');