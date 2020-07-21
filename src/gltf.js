import * as twgl from "twgl.js";
import {TRS} from "./trs";
import {Spatial} from "./spatial";
import {MeshRenderer} from "./mesh-renderer";
import {getProgramByName} from "./materials";
import {decodeBase64} from "./base64";
import {SkinRenderer} from "./skin-renderer";
import {Skin} from "./skin";
import {Animation, AnimationChannel, AnimationSampler, Animator, ANIMATOR} from "./animation";
import {AABB} from "./intersect";
import {StaticBody} from "./physics";

export function parseGLTF(gl, gltf) {
    parseBuffers(gl, gltf);
    parseTextures(gl, gltf);
    parseMaterials(gl, gltf);
    parseMeshes(gl, gltf);
    parseNodes(gl, gltf);
    return gltf;
}

function parseBuffers(gl, gltf) {
    if (gltf.buffers) {
        const BASE64_PREFIX = 'data:application/octet-stream;base64,';
        gltf.buffers = gltf.buffers.map(buffer => {
            if (buffer.uri && buffer.uri.startsWith(BASE64_PREFIX)) {
                const data = decodeBase64(buffer.uri.substr(BASE64_PREFIX.length));
                if (data.byteLength !== buffer.byteLength) {
                    throw new Error(
                        `Actual length ${data.byteLength} does not correspond to
                         length ${buffer.byteLength} specified in glTF-file.`);
                }
                return data;
            } else {
                console.warn('Buffer data not embedded in glTF-file.');
                throw new Error('Buffer data not embedded in glTF-file.');
            }
        });
    }
}

let tempCanvas, tempContext;
const images = {};

function parseTextures(gl, gltf) {
    if (gltf.textures && gltf.textures.length > 0) {
        gltf.textures = gltf.textures.map(tex => {
            const image   = gltf.images[tex.source];
            const sampler = gltf.samplers[tex.sampler];

            if (image.uri) {
                throw new Error('Only embedded images are supported right now.');
            }

            const bufferView = gltf.bufferViews[image.bufferView];
            if (!bufferView.webglTexture) {
                if (typeof(images[image.name]) !== 'undefined') {
                    bufferView.webglTexture = images[image.name];

                } else {
                    const arrayBuffer = gltf.buffers[bufferView.buffer];
                    const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);

                    const texture = gl.createTexture();

                    const blob = new Blob([data], {type: image.mimeType});
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = ev => {

                        if (!tempContext) {
                            tempCanvas = document.createElement("canvas");
                            tempContext = tempCanvas.getContext('2d');
                        }

                        console.log(`Loading image '${image.name}'`);

                        tempCanvas.width = img.width;
                        tempCanvas.height = img.height;
                        tempContext.clearRect(0, 0, img.width, img.height);
                        tempContext.drawImage(img, 0, 0, img.width, img.height);

                        let imgData = tempContext.getImageData(0, 0, img.width, img.height);

                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imgData.width,  imgData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);

                        // Ignore sampler settings, always use NEAREST
                        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter || gl.NEAREST);
                        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler.minFilter || gl.NEAREST);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, sampler.wrapS || gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, sampler.wrapT || gl.CLAMP_TO_EDGE);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    };
                    img.src = url;

                    // We set the texture here, but it might take some more time until the data has been uploaded.
                    bufferView.webglTexture = texture;
                    images[image.name] = texture;
                }
            }

            return bufferView.webglTexture;
        });
    }

    tempCanvas = null;
    tempContext = null;
}

function parseMaterials(gl, gltf) {
    if (gltf.materials && gltf.materials.length > 0) {
        gltf.materials.forEach(material => {
            material.program = getProgramByName(material.name);
            const {baseColorTexture} = material.pbrMetallicRoughness;
            if (baseColorTexture) {
                // Ignore mutiple texture coordinates
                material.pbrMetallicRoughness.baseColorTexture = gltf.textures[baseColorTexture.index];
            }
        });
    } else {
        throw new Error('No materials defined in the GLTF-file.');
    }
}

function isMeshCollider(mesh) {
    return typeof(mesh.extras) !== 'undefined' && mesh.extras
        && typeof(mesh.extras.collider) !== 'undefined' && mesh.extras.collider;
}

function parseMeshes(gl, gltf) {
    gltf.meshes.forEach(mesh => {

        // Check if this mesh is a stand-in for a collider
        if (isMeshCollider(mesh)) {
            console.log(`Found collider named '${mesh.name}'`);

            mesh.primitives.forEach(primitive => {
                for (const [attribName, index] of Object.entries(primitive.attributes)) {
                    if (attribName !== 'POSITION') continue;

                    const accessor = gltf.accessors[index];
                    const bufferView = gltf.bufferViews[accessor.bufferView];
                    const arrayBuffer = gltf.buffers[bufferView.buffer];
                    const data = new Float32Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength / 4);

                    let x = Math.round(data[0] * 100) / 100;
                    let y = Math.round(data[1] * 100) / 100;
                    let z = Math.round(data[2] * 100) / 100;

                    const minCorner = twgl.v3.create(x, y, z);
                    const maxCorner = twgl.v3.create(x, y, z);
                    for (let i = 1; i < data.length / 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            const val = Math.round(data[i * 3 + j] * 100) / 100;
                            if (val < minCorner[j]) minCorner[j] = val;
                            if (val > maxCorner[j]) maxCorner[j] = val;
                        }
                    }

                    console.log(`Parsed AABB from ${minCorner} to ${maxCorner}`);
                    mesh.collider = new AABB(minCorner, maxCorner);

                    return;
                }
            });

        // It is not a collider, so we should parse the primitives.
        } else {
            mesh.primitives.forEach(primitive => {
                const attribs = {};
                let numElements;

                for (const [attribName, index] of Object.entries(primitive.attributes)) {
                    const {accessor, buffer, stride} = getAccessorAndWebGLBuffer(gl, gltf, index, gl.ARRAY_BUFFER);
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
                    numElements
                };

                if (typeof(primitive.indices) !== 'undefined') {
                    const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices, gl.ELEMENT_ARRAY_BUFFER);
                    bufferInfo.numElements = accessor.count;
                    bufferInfo.indices = buffer;
                    bufferInfo.elementType = accessor.componentType;
                }

                // TODO: primitive.mode can be used to determine if triangles or edges

                primitive.bufferInfo = bufferInfo;
                primitive.material = gltf.materials[primitive.material];
                primitive.vao = twgl.createVAOFromBufferInfo(gl, primitive.material.program, primitive.bufferInfo);

            });
        }
    });
}

function parseNodes(gl, gltf) {
    const origNodes = gltf.nodes;
    const skinNodes = [];

    gltf.nodes = gltf.nodes.map(n => {
        const {name, skin, mesh, translation, rotation, scale} = n;
        const trs = new TRS(translation, rotation, scale);
        const spatial = new Spatial(name, trs);

        if (typeof(mesh) !== 'undefined') {
            const realMesh = gltf.meshes[mesh];

            if (realMesh.collider) {

                if (translation) {
                    twgl.v3.add(translation, realMesh.collider.min, realMesh.collider.min);
                    twgl.v3.add(translation, realMesh.collider.max, realMesh.collider.max);
                }

                spatial.addComponent(new StaticBody(spatial, realMesh.collider));

            } else if (typeof(skin) !== 'undefined') {
                skinNodes.push({spatial, mesh: realMesh, skinIdx: skin});
            } else if (realMesh) {
                spatial.addComponent(new MeshRenderer(spatial, realMesh));
            } else {
                throw new Error(`Could not find mesh ${mesh} referenced in GLTF-file.`);
            }
        }

        return spatial;
    });

    gltf.nodes.forEach((node, idx) => {
        const children = origNodes[idx].children;
        if (children) {
            addChildren(gltf.nodes, node, children);
        }
    });

    if (gltf.skins) {
        gltf.skins = gltf.skins.map(skin => {
            const joints = skin.joints.map(idx => gltf.nodes[idx]);
            const {stride, array} = getAccessorTypedArrayAndStride(gl, gltf, skin.inverseBindMatrices);
            return new Skin(gl, joints, array);
        });

        for (const {spatial, mesh, skinIdx} of skinNodes) {
            spatial.addComponent(new SkinRenderer(spatial, mesh, gltf.skins[skinIdx]));
        }
    }

    if (gltf.animations) {
        gltf.animations = gltf.animations.map(anim => {
            const name = anim.name;

            anim.samplers = anim.samplers.map(sampler => {
                const timestamps = getAccessorTypedArrayAndStride(gl, gltf, sampler.input).array;
                const values     = getAccessorTypedArrayAndStride(gl, gltf, sampler.output).array;
                return new AnimationSampler(timestamps, values, sampler.interpolation);
            });

            // Array of ancestors that all channels share.
            let lineage = [];

            anim.channels = anim.channels.map(channel => {
                const spatial = gltf.nodes[channel.target.node];
                const path    = channel.target.path;
                const sampler = anim.samplers[channel.sampler];
                channel = new AnimationChannel(spatial, path, sampler);

                if (lineage.length === 0) {
                    let at = spatial;
                    while (at) {
                        lineage.unshift(at);
                        at = at.parent;
                    }
                } else {
                    let newLineage = [];
                    let at = spatial;

                    while (at) {
                        newLineage.unshift(at);
                        at = at.parent;
                    }

                    let lim = Math.min(newLineage.length, lineage.length);
                    for (let i = 0; i < lim; i++) {
                        if (lineage[i] !== newLineage[i]) {
                            if (i === 0) throw new Error(`There are channels in the animation '${name}' that do not 
                                belong to the same scene tree.`);
                            lineage.length = i;
                        }
                    }
                }

                return channel;
            });

            let animation = new Animation(name, anim.channels);

            // Lineage is now the path to the most common ancestor of all channels. That is where the Animator should be
            // placed.
            let rootSpatial = lineage[lineage.length - 1];
            if (rootSpatial.hasComponent(ANIMATOR)) {
                let animator = rootSpatial.getComponent(ANIMATOR);
                animator.addAnimation(animation);
            } else {
                let animator = new Animator(rootSpatial);
                animator.addAnimation(animation);
                rootSpatial.addComponent(animator);
            }

            return animation;
        });
    }

    gltf.scenes.forEach(scene => {
        scene.root = new Spatial(scene.name);
        addChildren(gltf.nodes, scene.root, scene.nodes);
    });
}

function accessorTypeToNumComponents(type) {
    return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
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

function glTypeToTypedArray(type) {
    return glTypeToTypedArrayMap[type] || throwNoKey(type);
}

const glTypeToTypedArrayMap = {
    '5120': Int8Array,    // gl.BYTE
    '5121': Uint8Array,   // gl.UNSIGNED_BYTE
    '5122': Int16Array,   // gl.SHORT
    '5123': Uint16Array,  // gl.UNSIGNED_SHORT
    '5124': Int32Array,   // gl.INT
    '5125': Uint32Array,  // gl.UNSIGNED_INT
    '5126': Float32Array, // gl.FLOAT
};

function throwNoKey(key) {
    throw new Error(`No key: ${key}`);
}

function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex, target) {
    const accessor = gltf.accessors[accessorIndex];
    const result = getWebGLBuffer(gl, gltf, accessor.bufferView, target);
    return {
        ...result,
        accessor
    };
    /*const bufferView = gltf.bufferViews[accessor.bufferView];
    if (!bufferView.webglBuffer) {
        const buffer = gl.createBuffer();
        //const target = bufferView.target || gl.ARRAY_BUFFER;
        const arrayBuffer = gltf.buffers[bufferView.buffer];
        const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        gl.bindBuffer(target, null);
        bufferView.webglBuffer = buffer;
    }
    return {
        accessor,
        buffer: bufferView.webglBuffer,
        stride: bufferView.stride || 0
    };*/
}

function getWebGLBuffer(gl, gltf, bufferViewIdx, target) {
    const bufferView = gltf.bufferViews[bufferViewIdx];
    if (!bufferView.webglBuffer) {
        const buffer = gl.createBuffer();
        const arrayBuffer = gltf.buffers[bufferView.buffer];
        const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        gl.bindBuffer(target, null);
        bufferView.webglBuffer = buffer;
    }
    return {
        buffer: bufferView.webglBuffer,
        stride: bufferView.stride || 0
    };
}

function getAccessorTypedArrayAndStride(gl, gltf, accessorIdx) {
    const accessor = gltf.accessors[accessorIdx];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const TypedArray = glTypeToTypedArray(accessor.componentType);
    const buffer = gltf.buffers[bufferView.buffer];
    return {
        accessor,
        array: new TypedArray(
            buffer,
            bufferView.byteOffset + (accessor.byteOffset || 0),
            accessor.count * accessorTypeToNumComponents(accessor.type)),
        stride: bufferView.byteStride || 0,
    };
}

function addChildren(nodes, node, childIndices) {
    childIndices.forEach(childIdx => {
        const child = nodes[childIdx];
        child.setParent(node);
    });
}
