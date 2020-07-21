export const BASE_COMPONENT = "base";

/**
 * Abstract base class for all components that can be added to a spatial.
 * Components should be added before the spatial is added to the scene.
 */
export class Component {
    /**
     *
     * @param {Spatial} owner  that has this component
     */
    constructor(owner) {
        this.owner = owner;
    }

    typeName() {
        return BASE_COMPONENT;
    }

    onAdd(renderer) {}

    onRemove(renderer) {}
}
