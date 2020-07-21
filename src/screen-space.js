import * as twgl from "twgl.js";
import {readFileSync} from "fs";

const FRAMEBUFFER_WIDTH  = 320;
const FRAMEBUFFER_HEIGHT = 180;

export class ScreenSpace {
    constructor(gl) {
        if (!gl.getExtension('EXT_color_buffer_float')) {
            throw new Error('FLOAT color buffer not available');
        }

        if (!gl.getExtension('WEBGL_draw_buffers')) {
            throw new Error('Draw buffers extension not available');
        }

        this.gl = gl;
        this.clearBits = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

        this.triArray = gl.createVertexArray();
        this.screenspaceProgram = twgl.createProgramInfo(gl, [screenspaceVS, screenspaceFS]);
        this.upscaleProgram = twgl.createProgramInfo(gl, [screenspaceVS, screenspaceFS]);

        //
        // gl.activeTexture(gl.TEXTURE0);

        this.gBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
        this.base     = createColorTarget(gl, gl.COLOR_ATTACHMENT0);
        this.position = createPositionTarget(gl, gl.COLOR_ATTACHMENT1);
        this.normal   = createPositionTarget(gl, gl.COLOR_ATTACHMENT2);
        this.depth    = createDepthTarget(gl);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2
        ]);

        this.compose = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.compose);
        this.diffuse  = createColorTarget(gl, gl.COLOR_ATTACHMENT0);
        this.specular = createColorTarget(gl, gl.COLOR_ATTACHMENT1);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`Framebuffer status is '${status}'`);
        }
    }

    beginGBuffer() {
        const {gl, clearBits, gBuffer} = this;

        gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);
        gl.viewport(0, 0, FRAMEBUFFER_WIDTH, FRAMEBUFFER_HEIGHT);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clear(clearBits);
    }

    beginComposition() {
        const {gl, clearBits, compose} = this;

        gl.bindFramebuffer(gl.FRAMEBUFFER, compose);
        gl.viewport(0, 0, FRAMEBUFFER_WIDTH, FRAMEBUFFER_HEIGHT);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.clear(clearBits);
    }

    beginFinal(camera) {
        const {gl, clearBits} = this;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, camera.width, camera.height);
        gl.depthMask(false);
        gl.enable(gl.false);
        gl.clear(clearBits);
    }

    render(camera, sharedUniforms, callback) {
        this.beginComposition();

        const programInfo = this.screenspaceProgram;

        gl.useProgram(programInfo.program);
        gl.bindVertexArray(this.triArray);

        twgl.setUniforms(programInfo, sharedUniforms);
        twgl.setUniforms(programInfo, {
            u_base: this.base,
            u_position: this.position,
            u_normal: this.normal
        });

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}

function createColorTarget(gl, colorAttachment) {
    return createTextureTarget(gl, {
        attachment: colorAttachment,
        internalFormat: gl.RGBA
    });
}

function createPositionTarget(gl, colorAttachment) {
    return createTextureTarget(gl, {
        attachment: colorAttachment,
        internalFormat: gl.RGBA16F
    });
}

function createDepthTarget(gl) {
    return createTextureTarget(gl, {
        attachment: gl.DEPTH_ATTACHMENT,
        internalFormat: gl.DEPTH_COMPONENT24
    });
}

function createTextureTarget(gl, options) {
    const {attachment, internalFormat} = options;
    const level = 0;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat,
        FRAMEBUFFER_WIDTH, FRAMEBUFFER_HEIGHT);



    //gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
    //    FRAMEBUFFER_WIDTH, FRAMEBUFFER_HEIGHT, 0,
    //    format, type, null);




    //const fb = gl.createFramebuffer();
    //gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, level);

    return tex;
}

const screenspaceVS = readFileSync('src/shader/screenspace.vert', 'utf8');
const screenspaceFS = readFileSync('src/shader/compose.frag', 'utf8');
const upscaleVS = readFileSync('src/shader/upscale.vert', 'utf8');
const upscaleFS = readFileSync('src/shader/upscale.frag', 'utf8');
