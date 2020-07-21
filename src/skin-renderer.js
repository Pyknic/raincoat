import {MeshRenderer} from "./mesh-renderer";
import * as twgl from "twgl.js";
import {getProgramByName, PROGRAM_SKINNED_SHADOW} from "./materials";

export class SkinRenderer extends MeshRenderer {
    constructor(owner, mesh, skin) {
        super(owner, mesh);
        this.skin = skin;
    }

    render(gl, camera, sharedUniforms, ref, passName) {
        const {owner, skin} = this;
        skin.update(owner);
        super.render(gl, camera, sharedUniforms, ref, passName);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.activeTexture(gl.TEXTURE0);
    }

    shadowProgramInfo() {
        return getProgramByName(PROGRAM_SKINNED_SHADOW);
    }

    _setUniforms(gl, programInfo) {
        super._setUniforms(gl, programInfo);
        const {skin} = this;
        twgl.setUniforms(programInfo, {
            //u_jointTexture: skin.jointTexture,
            u_numJoints: skin.joints.length
        });
        skin.render(programInfo.program);
    }
}
