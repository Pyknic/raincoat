import {PASS_COLOR, PASS_SHADOW} from "./renderer";
import * as twgl from "twgl.js";
import {Component} from "./component";
import {getProgramByName, PROGRAM_SHADOW} from "./materials";

export const RENDER_TYPE = "renderer";

export class MeshRenderer extends Component {
    constructor(owner, mesh) {
        super(owner);
        this.mesh = mesh;
    }

    typeName() {
        return RENDER_TYPE;
    }

    shadowProgramInfo() {
        return getProgramByName(PROGRAM_SHADOW);
    }

    onAdd(renderer) {
        renderer.addToPass(PASS_COLOR, this.owner.name, this);
        renderer.addToPass(PASS_SHADOW, this.owner.name, this);
    }

    onRemove(renderer) {
        renderer.removeFromPass(PASS_COLOR, this);
        renderer.removeFromPass(PASS_SHADOW, this);
    }

    render(gl, camera, sharedUniforms, ref, passName) {
        const {owner, mesh} = this;

        for (const primitive of mesh.primitives) {
            let material = primitive.material;
            let programInfo;
            if (passName === PASS_SHADOW) {
                material = null;
                programInfo = this.shadowProgramInfo();
            } else {
                programInfo = material.program;
            }

            gl.useProgram(programInfo.program);
            gl.bindVertexArray(primitive.vao);

            if (passName === PASS_COLOR) {
                if (material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorTexture) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, material.pbrMetallicRoughness.baseColorTexture);

                    const baseColorTexLoc = gl.getUniformLocation(programInfo.program, 'u_baseColorTexture');
                    gl.uniform1i(baseColorTexLoc, 0);
                } else {
                    console.error(material);
                    break;
                }
            } else {
                const colLoc = gl.getUniformLocation(programInfo.program, 'u_color');
                gl.uniform4f(colLoc, 1.0, 0.0, 1.0, 1.0);
            }

            twgl.setUniforms(programInfo, {
                u_projection: camera.projection,
                u_view: camera.view,
                u_world: owner.worldMatrix
            });

            if (passName === PASS_COLOR) {
                twgl.setUniforms(programInfo, primitive.material.uniforms);
            }

            twgl.setUniforms(programInfo, sharedUniforms);
            this._setUniforms(gl, programInfo);

            twgl.drawBufferInfo(gl, primitive.bufferInfo);

            if (passName === PASS_COLOR) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
        }
    }

    _setUniforms(gl, programInfo) {}
}
