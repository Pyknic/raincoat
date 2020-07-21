import * as twgl from "twgl.js";

/**
 * The skin is built up by a hierarchy of matrices. Each vertex is affected by up to
 * four of those matrices. How much each matrix affect the vertex is determined by a
 * weight. The sum of all four weights is always 1.
 *
 * All the bone matrices are stored in a texture. Each vertical row in the texture
 * is one bone. The row has four pixels in width and each pixel has four values
 * (RGBA). Together these form a 4-by-4 matrix.
 *
 * The final orientation of a vertex is determined using a linear combination of the
 * four bones affecting that vertex, as determined by the weights specified in the
 * GLSL-file.
 */
export class Skin {
    /**
     * Creates a new instance of Skin.
     *
     * @param {WebGL2RenderingContext} gl
     * @param {Spatial[]} joints
     * @param {Float32Array} inverseBindMatrixData  representing several 'mat4's
     */
    constructor(gl, joints, inverseBindMatrixData) {
        this.gl = gl;
        this.joints = joints;
        this.inverseBindMatrices = [];
        this.jointMatrices = [];
        this.jointData = new Float32Array(joints.length * 16);

        for (let i = 0; i < joints.length; i++) {
            this.inverseBindMatrices.push(new Float32Array(
                inverseBindMatrixData.buffer,
                inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
                16
            ));
            this.jointMatrices.push(new Float32Array(
                this.jointData.buffer,
                Float32Array.BYTES_PER_ELEMENT * 16 * i,
                16
            ));
        }

        // Get around the limited number of uniform values that can be
        // bound at any given time by storing bone orientation data in
        // a texture instead.
        this.jointTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.jointTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Updates the bone matrices in the video memory with the current orientation
     * of the armature spatials. The orientations are stored relative to the
     * specified spatial so that the skinned mesh can be instantiated.
     *
     * @param relativeToSpatial  the spatial to store coordinates relative to
     */
    update(relativeToSpatial) {
        const {gl} = this;
        const globalWorldInverse = twgl.m4.inverse(relativeToSpatial.worldMatrix);

        for (let i = 0; i < this.joints.length; i++) {
            const joint = this.joints[i];
            const dest = this.jointMatrices[i];
            twgl.m4.multiply(globalWorldInverse, joint.worldMatrix, dest);
            twgl.m4.multiply(dest, this.inverseBindMatrices[i], dest);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.jointTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, this.joints.length,
            0, gl.RGBA, gl.FLOAT, this.jointData);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    render(program) {
        const {gl} = this;

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.jointTexture);
        const jointTextureLoc = gl.getUniformLocation(program, 'u_jointTexture');
        gl.uniform1i(jointTextureLoc, 1);
    }
}
