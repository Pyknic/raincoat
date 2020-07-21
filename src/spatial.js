import {m4} from "twgl.js";
import {TRS} from "./trs";

export class Spatial {
    constructor(name = "root", trs = new TRS()) {
        this.name = name;
        this.parent = null;
        this.children = [];
        this.localMatrix = m4.identity();
        this.worldMatrix = m4.identity();
        this.components = {};
        this.trs = trs;
    }

    uniqueName() {
        if (this.parent) {
            return `${this.parent.uniqueName()}.${this.name}`;
        } else {
            return this.name;
        }
    }

    addChild(spatial) {
        spatial.setParent(this);
        return true;
    }

    removeChild(spatial) {
        if (spatial.parent === this) {
            spatial.setParent(null);
            return true;
        }
        return false;
    }

    selectOne(query) {
        if (this.name === query) {
            return this;
        } else {
            for (const child of this.children) {
                let result = child.selectOne(query);
                if (result) return result;
            }
            return null;
        }
    }

    addComponent(component) {
        this.components[component.typeName()] = component;
    }

    hasComponent(type) {
        return (typeof(this.components[type]) !== 'undefined');
    }

    getComponent(type) {
        return this.components[type];
    }

    removeComponent(type) {
        if (typeof(type) === 'string') {
            this.components[type] = null;
        } else {
            type = type.typeName();
            if (typeof(type) !== 'string') {
                throw new Error('Expected argument to be either a string or a Component.');
            }
            this.components[type] = null;
        }
    }

    setParent(parent) {
        // Clear the current parent
        if (this.parent) {
            let idx = this.parent.children.indexOf(this);
            if (idx >= 0) {
                this.parent.children.splice(idx, 1);
            }
            this.parent = null;
        }

        // Add this spatial to the new parent
        if (parent) {
            parent.children.push(this);
            this.parent = parent;
        }
    }

    traverse(action) {
        action(this);
        for (const child of this.children) {
            child.traverse(action);
        }
    }

    breadthFirst(predicate) {
        const queue = [this];
        while (queue.length > 0) {
            const at = queue.shift();
            if (predicate(at)) {
                return at;
            } else {
                Array.prototype.push.apply(queue, at.children);
            }
        }
        return null;
    }

    updateWorldMatrix(matrix) {
        const transform = this.trs;
        if (transform) {
            transform.getMatrix(this.localMatrix);
        }

        // Compute current world matrix
        if (matrix) {
            m4.multiply(matrix, this.localMatrix, this.worldMatrix);
        } else {
            m4.copy(this.localMatrix, this.worldMatrix);
        }

        // Process children
        const worldMatrix = this.worldMatrix;
        this.children.forEach(child => {
            child.updateWorldMatrix(worldMatrix);
        });
    }
}
