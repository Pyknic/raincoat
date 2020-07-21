import * as twgl from "twgl.js";
import {readFileSync} from "fs";
import {PASS_COLOR, PASS_SHADOW} from "./renderer";
import {DirectionalLight} from "./directional-light";
import {degToRad} from "./units";

const GBUFFER_WIDTH  = 320;
const GBUFFER_HEIGHT = 180;

const EXTENSIONS = [
    'EXT_color_buffer_float'
];

export class GBuffer {

    constructor(gl) {
        this.gl = gl;

        EXTENSIONS.forEach(ext => {
            let found = gl.getExtension(ext);
            if (!found) {
                throw new Error(`Could not find the '${found}' extension`);
            }
        });

        gl.clearColor(0, 0, 0, 1);

        //
        // Main Pass
        //
        this.mainPass = twgl.createFramebufferInfo(gl, [
            colorTarget(gl),  // Base Color
            vectorTarget(gl), // Position
            vectorTarget(gl), // Normal
            depthTarget(gl)   // Depth
        ], GBUFFER_WIDTH, GBUFFER_HEIGHT); // TODO: Check if the depthTarget needs to be reused for the edges

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2
        ]);

        //
        // Depth Pass
        //
        this.shadowMap = gl.createTexture();
        const depthTextureSize = 512;
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16,
        //     depthTextureSize, depthTextureSize, 0,
        //     gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, depthTextureSize, depthTextureSize);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

        this.debugShadowMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.debugShadowMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            depthTextureSize, depthTextureSize, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.shadowPass = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowPass);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowMap, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.debugShadowMap, 0);
        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0
        ]);

        this.dirLight = new DirectionalLight(
            [2, Math.sqrt(2/3) * 6, -10],
            twgl.v3.normalize([-2, -Math.sqrt(2/3)*6, 10])
        );

        /*this.dirLight = new DirectionalLight(
            [0, Math.sqrt(2/3) * 10, -30],
            twgl.v3.normalize([0, -Math.sqrt(2/3)*10, 30])
        );*/


        /*this.dirLight = new DirectionalLight(
            [0, 2.3*2, -5*2],
            twgl.v3.normalize([
                0,
                Math.sin(degToRad(-70)),
                Math.cos(degToRad(-70))
            ])
        );*/

        //
        // Edges Pass
        //
        this.edgesPass = twgl.createFramebufferInfo(gl, [
            colorTarget(gl), // Edges
        ], GBUFFER_WIDTH, GBUFFER_HEIGHT);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0
        ]);

        //
        // Compose Pass
        //
        this.composePass = twgl.createFramebufferInfo(gl, [
            colorTarget(gl) // Diffuse Color
        ], GBUFFER_WIDTH, GBUFFER_HEIGHT);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0
        ]);

        //
        // Programs
        //
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.vao = gl.createVertexArray();
        this.edgesProgram = twgl.createProgramInfo(gl, [screenspaceVS, edgesFS]);
        this.composeProgram = twgl.createProgramInfo(gl, [screenspaceVS, composeFS]);
        this.upscaleProgram = twgl.createProgramInfo(gl, [screenspaceVS, upscaleFS]);


        //this.shadowBias = 0.0013;
        this.shadowBias = 0.0025;
        /*
        {
            let range = document.createElement('input');
            range.type = 'range';
            range.value = this.shadowBias;
            range.min = 0.0;
            range.max = 0.01;
            range.step = 0.0001;
            range.oninput = ev => {
                this.shadowBias = range.value;
                console.log(this.shadowBias);
            };
            document.body.appendChild(range);
        }

        this.sampleDist = 0.5;
        {
            let range = document.createElement('input');
            range.type = 'range';
            range.value = this.sampleDist;
            range.min = 0.0;
            range.max = 0.01;
            range.step = 0.0001;
            range.oninput = ev => {
                this.sampleDist = range.value;
                console.log(this.sampleDist);
            };
            document.body.appendChild(range);
        }*/
    }

    // computeLightMatrix(uniforms) {
    //     const lightX = twgl.v3.cross([0, -1, 0], uniforms.u_lightDirection);
    //     const lightY = twgl.v3.cross(lightX, uniforms.u_lightDirection);
    //     const lightZ = uniforms.u_lightDirection;
    //     return Float32Array.from([
    //         lightX[0], lightX[1], lightX[2], 0.0,
    //         lightY[0], lightY[1], lightY[2], 0.0,
    //         lightZ[0], lightZ[1], lightZ[2], 0.0,
    //         0.0, Math.sqrt(2/3)*10, -10.0, 1.0
    //     ]);
    // }

    render(camera, sharedUniforms, renderer) {
        const {gl} = this;

        //
        // Main pass (draw all entities into the GBuffer)
        //
        twgl.bindFramebufferInfo(gl, this.mainPass);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        renderer.renderPass(PASS_COLOR, camera, sharedUniforms);

        //
        // Shadow Pass
        //
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowPass);
        gl.viewport(0, 0, 512, 512);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.dirLight.updateMatrices();
        renderer.renderPass(PASS_SHADOW, this.dirLight, sharedUniforms);

        let textureMatrix = twgl.m4.identity();
        textureMatrix = twgl.m4.translate(textureMatrix, [0.5, 0.5, 0.5]);
        textureMatrix = twgl.m4.scale(textureMatrix, [0.5, 0.5, 0.5]);
        textureMatrix = twgl.m4.multiply(textureMatrix, this.dirLight.projection);
        textureMatrix = twgl.m4.multiply(textureMatrix, this.dirLight.view);
        textureMatrix = twgl.m4.multiply(textureMatrix, twgl.m4.inverse(camera.view));
        //console.log(textureMatrix);

        //
        // Edges Pass
        //
        twgl.bindFramebufferInfo(gl, this.edgesPass);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.edgesProgram.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.mainPass.attachments[1]);
        const edgesPosLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_position');
        gl.uniform1i(edgesPosLoc, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.mainPass.attachments[2]);
        const edgesNormLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_normal');
        gl.uniform1i(edgesNormLoc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        const shadowMapLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_shadowMap');
        gl.uniform1i(shadowMapLoc, 2);
        const shadowMatrixLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_shadowMatrix');
        gl.uniformMatrix4fv(shadowMatrixLoc, false, textureMatrix);
        const shadowBiasLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_shadowBias');
        gl.uniform1f(shadowBiasLoc, this.shadowBias);
        const sampleDistLoc = gl.getUniformLocation(this.edgesProgram.program, 'u_sampleDist');
        gl.uniform1f(sampleDistLoc, this.sampleDist);

        // console.log(textureMatrix);

        twgl.setUniforms(this.edgesProgram, {
            ...sharedUniforms,
            u_view: camera.view
        });
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        //
        // Composition Pass (Compose GBuffers into a single Diffuse buffer)
        //
        twgl.bindFramebufferInfo(gl, this.composePass);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.composeProgram.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.mainPass.attachments[0]);

        const baseLoc = gl.getUniformLocation(this.composeProgram.program, 'u_base');
        gl.uniform1i(baseLoc, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.mainPass.attachments[1]);

        const positionLoc = gl.getUniformLocation(this.composeProgram.program, 'u_position');
        gl.uniform1i(positionLoc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.mainPass.attachments[2]);

        const normalLoc = gl.getUniformLocation(this.composeProgram.program, 'u_normal');
        gl.uniform1i(normalLoc, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.edgesPass.attachments[0]);

        const edgesLoc = gl.getUniformLocation(this.composeProgram.program, 'u_edges');
        gl.uniform1i(edgesLoc, 3);

        twgl.setUniforms(this.composeProgram, sharedUniforms);

        /*twgl.setUniforms(this.composeProgram, {
            ...sharedUniforms,
            u_base: 0,
            u_position: 1,
            u_normal: 2
        });*/



        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        //
        // Upscale Pass (Scale the buffer to the original resolution)
        //

        twgl.bindFramebufferInfo(gl);

        //gl.viewport(0, 0, camera.width, camera.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.upscaleProgram.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.composePass.attachments[0]);

        const composedLoc = gl.getUniformLocation(this.upscaleProgram.program, 'u_composed');
        gl.uniform1i(composedLoc, 0);

        // twgl.setUniforms(this.upscaleProgram, {
        //     u_composed: 0
        // });
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}

function colorTarget(gl) {
    return {
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        mag: gl.NEAREST,
        min: gl.NEAREST
    };
}

function vectorTarget(gl) {
    return {
        format: gl.RGBA,
        internalFormat: gl.RGBA16F,
        //internalFormat: gl.RGBA,
        type: gl.HALF_FLOAT,
        //type: gl.UNSIGNED_BYTE,
        mag: gl.NEAREST,
        min: gl.NEAREST
    };
}

function depthTarget(gl) {
    return {
        format: gl.DEPTH_STENCIL,
        mag: gl.LINEAR,
        min: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE
    };
}

const screenspaceVS = readFileSync('src/shader/screenspace.vert', 'utf8');
const composeFS = readFileSync('src/shader/compose.frag', 'utf8');
const upscaleFS = readFileSync('src/shader/upscale.frag', 'utf8');
const edgesFS = readFileSync('src/shader/edges.frag', 'utf8');
