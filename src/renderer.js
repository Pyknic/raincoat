import {Spatial} from "./spatial";
import * as twgl from "twgl.js";
import {GBuffer} from "./gbuffer";

export const PASS_COLOR = 'color';
export const PASS_SHADOW = 'shadow';

export class Renderer {

    constructor(gl) {
        this.gl = gl;
        this.root = new Spatial();

        this.updates = [];
        this.updatesAddBuffer = [];
        this.updatesRemoveBuffer = [];

        this.passes = {};
        this.passes[PASS_COLOR] = new RenderPass(PASS_COLOR);
        this.passes[PASS_SHADOW] = new RenderPass(PASS_SHADOW);

        this.obstacles = [];

        this.gbuffer = new GBuffer(gl);

        this.sharedUniforms = {
            u_lightDirection: twgl.v3.normalize([0, -Math.sqrt(2/3)*4, 5]),
            u_diffuse: [1, 1, 0, 1]
        };
    }

    addGLTF(gltf) {
        gltf.scenes.forEach(scene => {
            console.log(scene.root);
            this.addSpatial(scene.root);
        });
    }

    addSpatial(spatial) {
        if (this.root.addChild(spatial)) {
            spatial.traverse(child => {
                for (const [componentType, component] of Object.entries(child.components)) {
                    if (typeof(component.onAdd) !== 'undefined') {
                        component.onAdd(this);
                    }
                }
            });
        }
    }

    removeSpatial(spatial) {
        if (this.root.removeChild(spatial)) {
            spatial.traverse(child => {
                for (const [componentType, component] of Object.entries(child.components)) {
                    if (typeof(component.onRemove) !== 'undefined') {
                        component.onRemove(this);
                    }
                }
            });
        }
    }

    addUpdateable(action) {
        this.updatesAddBuffer.push(action);
    }

    removeUpdateable(action) {
        this.updatesRemoveBuffer.push(action);
    }

    addObstacle(aabb) {
        this.obstacles.push(aabb);
    }

    removeObstacle(aabb) {
        let idx = this.obstacles.indexOf(aabb);
        if (idx >= 0) this.obstacles.splice(idx, 1);
    }

    addToPass(passName, ref, call) {
        let pass = this.passes[passName];
        if (pass) {
            return pass.addCall(ref, call);
        }
        return false;
    }

    removeFromPass(passName, call) {
        let pass = this.passes[passName];
        if (pass) {
            return pass.removeCall(call);
        }
        return false;
    }

    renderPass(passName, camera, uniforms) {
        camera.updateMatrices();
        let pass = this.passes[passName];
        if (pass) {
            pass.draw(this.gl, camera, uniforms);
        } else {
            throw new Error(`Render pass '${passName}' does not exist.`);
        }
    }

    updateAll() {
        if (this.updatesAddBuffer.length > 0) {
            this.updates = this.updates.concat(this.updatesAddBuffer);
            this.updatesAddBuffer.length = 0;
        }

        this.updates.forEach(action => action(this));

        if (this.updatesRemoveBuffer.length > 0) {
            this.updatesRemoveBuffer.forEach(toRemove => {
                let idx = this.updates.indexOf(toRemove);
                if (idx >= 0) this.updates.splice(idx, 1);
            });
            this.updatesRemoveBuffer.length = 0;
        }
    }

    renderAll(camera) {
        camera.updateMatrices();
        this.root.updateWorldMatrix();
        this.gbuffer.render(camera, this.sharedUniforms, this);
    }
}

class RenderPass {
    constructor(name) {
        this.name = name;
        this.calls = [];
        this.refs = [];
    }

    addCall(ref, call) {
        const at = this.calls.indexOf(call);
        if (at < 0) {
            this.calls.push(call);
            this.refs.push(ref);
            return true;
        }
        return false;
    }

    removeCall(call) {
        const at = this.calls.indexOf(call);
        if (at >= 0) {
            this.calls.splice(at, 1);
            this.refs.splice(at, 1);
            return true;
        }
        return false;
    }

    draw(gl, camera, sharedUniforms) {
        this.calls.forEach((call, idx) => {
            let ref = this.refs[idx];
            call.render(gl, camera, sharedUniforms, ref, this.name);
        });
    }
}
