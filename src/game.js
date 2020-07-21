import * as twgl from 'twgl.js';
import {Time} from "./time";
import {readFileSync} from 'fs';
import {degToRad} from "./units";

let gltf = JSON.parse(readFileSync('src/assets/cube.gltf', 'utf8'));

export class Game {
    constructor() {
        console.log('Creating Renderer');

        this.canvas = document.createElement('canvas');
        this.canvas.width = 1280;
        this.canvas.height = 720;
        this.scale = 0.25;
        document.body.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl2', {
            'alpha': false
        });

        const gl = this.gl;
        const canvas = this.canvas;
        const m4 = twgl.m4;

        console.log(`Using ${gl.getParameter(gl.VERSION)}`);
        if (!twgl.isWebGL2(gl)) {
            console.error(`This game requires WebGL2 to run.`);
            return;
        }

        twgl.setDefaults({
            attribPrefix: 'a_'
        });

        const tex = twgl.createTexture(gl, {
            src: 'src/assets/cube.png',
            mag: gl.NEAREST, min: gl.LINEAR
        });

        const programInfo = twgl.createProgramInfo(gl, [cubeVS, cubeFS]);
        const bufferInfo = twgl.createBufferInfoFromArrays(gl, cubeArrays);

        function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex) {
            const accessor = gltf.accessors[accessorIndex];
            const bufferView = gltf.bufferViews[accessor.bufferView];
            if (!bufferView.webglBuffer) {
                const buffer = gl.createBuffer();
                const target = bufferView.target || gl.ARRAY_BUFFER;
                const arrayBuffer = gltf.buffers[bufferView.buffer];
                const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
                gl.bindBuffer(target, buffer);
                gl.bufferData(target, data, gl.STATIC_DRAW);
                bufferView.webglBuffer = buffer;
            }
            return {
                accessor,
                buffer: bufferView.webglBuffer,
                stride: bufferView.stride || 0
            };
        }

        function throwNoKey(key) {
            throw new Error(`No key: ${key}`);
        }

        const accessorTypeToNumComponentsMap = {
            'SCALAR': 1,
            'VEC2': 2,
            'VEC3': 3,
            'VEC4': 4,
            'MAT2': 4,
            'MAT3': 9,
            'MAT4': 16,
        };

        function accessorTypeToNumComponents(type) {
            return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
        }

        const defaultMaterial = {
            uniforms: {
                u_diffuse: [.5, .8, 1, 1]
            }
        };

        gltf.meshes.forEach(mesh => {
            mesh.primitives.forEach(primitive => {
                const attribs = {};
                let numElements;

                for (const [attribName, index] of Object.entries(primitive.attributes)) {
                    const {accessor, buffer, stride} = getAccessorAndWebGLBuffer(gl, gltf, index);
                    numElements = accessor.count;
                    attribs[`a_${attribName}`] = {
                        buffer,
                        type: accessor.componentType,
                        numComponents: accessorTypeToNumComponents(accessor.type),
                        stride,
                        offset: accessor.byteOffset | 0
                    };
                }

                const bufferInfo = {
                    attribs,
                    numElements,
                };

                if (primitive.indices !== undefined) {
                    const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);
                    bufferInfo.numElements = accessor.count;
                    bufferInfo.indices = buffer;
                    bufferInfo.elementType = accessor.componentType;
                }

                primitive.bufferInfo = bufferInfo;
                primitive.vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, primitive.bufferInfo);
                primitive.material = gltf.materials && gltf.materials[primitive.material] || defaultMaterial;
            });
        });

        const camera = m4.identity();
        const viewMatrix = m4.identity();
        const viewProjectionMatrix = m4.identity();

        Time.previousTime = Time.now();
        Time.time = Time.now();

        const step = () => {
            Time.time = Time.now();
            Time.deltaTime = Time.time - Time.previousTime;

            // Update entities

            let projection = m4.perspective(
                degToRad(30),
                canvas.clientWidth / canvas.clientHeight,
                0.5, 100
            );

            let eye = [1, 4, -20];
            let target = [0, 0, 0];
            let up = [0, 1, 0];

            m4.lookAt(eye, target, up, camera);
            m4.inverse(camera, viewMatrix);
            m4.multiply(projection, viewMatrix, viewProjectionMatrix);

            let uniforms = {
                uPerspectiveView: viewProjectionMatrix,
                uDiffuse: tex
            };

            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(programInfo.program);
            twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
            twgl.setUniforms(programInfo, uniforms);
            twgl.drawBufferInfo(gl, bufferInfo);

            Time.previousTime = Time.time;
            if (!this.stopRunning)
                requestAnimationFrame(step);
        };

        this.stopRunning = false;
        requestAnimationFrame(step);
    }
}

const cubeVS = readFileSync('src/shader/cube.vert', 'utf8');
const cubeFS = readFileSync('src/shader/cube.frag', 'utf8');

console.log(gltf);

const cubeArrays = {
    position: [
        // Front face
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
    ],
    normal: [
        // Front face
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // Back face
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,

        // Top face
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // Bottom face
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,

        // Right face
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        // Left face
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0
    ],
    texcoord: [
        // Front
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Back
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Top
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Bottom
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Right
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Left
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0
    ],
    indices: [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23    // left
    ]
};
