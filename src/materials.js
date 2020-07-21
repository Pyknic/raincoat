import {readFileSync} from "fs";
import * as twgl from "twgl.js";

export const PROGRAM_TEXTURED = 'Standard';
export const PROGRAM_SKINNED_TEXTURED = 'Girl';
export const PROGRAM_SKINNED_SHADOW = 'SkinShadow';
export const PROGRAM_SHADOW = 'Shadow';

export function loadPrograms(gl) {
    programs[PROGRAM_TEXTURED] = twgl.createProgramInfo(gl, [texVS, texFS], {
        attribLocations: {
            'a_POSITION': 0,
            'a_NORMAL': 1,
            'a_TEXCOORD_0': 2
        }
    });

    programs[PROGRAM_SKINNED_TEXTURED] = twgl.createProgramInfo(gl, [skinTexVS, skinTexFS], {
        attribLocations: {
            'a_POSITION': 0,
            'a_NORMAL': 1,
            'a_TEXCOORD_0': 2,
            'a_WEIGHTS_0': 3,
            'a_JOINTS_0': 4
        }
    });

    programs[PROGRAM_SHADOW] = twgl.createProgramInfo(gl, [shadowVS, shadowFS], {
        attribLocations: {
            'a_POSITION': 0
        }
    });

    programs[PROGRAM_SKINNED_SHADOW] = twgl.createProgramInfo(gl, [skinShadowVS, skinShadowFS], {
        attribLocations: {
            'a_POSITION': 0,
            'a_NORMAL': 1,
            'a_TEXCOORD_0': 2,
            'a_WEIGHTS_0': 3,
            'a_JOINTS_0': 4
        }
    });
}

export function getProgramByName(name) {
    let program = programs[name];
    if (program) return program;
    throw new Error(`Program '${name}' not found.`);
}

const programs = {};

const skinTexVS = readFileSync('src/shader/skinned_textured.vert', 'utf8');
const skinTexFS = readFileSync('src/shader/skinned_textured.frag', 'utf8');

const skinShadowVS = readFileSync('src/shader/skinned_shadow.vert', 'utf8');
const skinShadowFS = readFileSync('src/shader/skinned_shadow.frag', 'utf8');

const texVS = readFileSync('src/shader/textured.vert', 'utf8');
const texFS = readFileSync('src/shader/textured.frag', 'utf8');

const shadowVS = readFileSync('src/shader/shadow.vert', 'utf8');
const shadowFS = readFileSync('src/shader/shadow.frag', 'utf8');
