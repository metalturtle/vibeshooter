export class Entity {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.components = new Map();
    }

    addComponent(...components) {
        components.forEach(component => {
            this.components.set(component.constructor.name, component);
        });
        return this;
    }
}
