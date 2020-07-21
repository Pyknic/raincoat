import * as twgl from "twgl.js";
import {degToRad} from "./units";
import {Time} from "./time";
const m4 = twgl.m4;

const SQRT_2 = Math.sqrt(2);
const NUM_TILES_HORIZONTALLY = 5;
const THETA = Math.asin(0.5); // 30 degrees
const TAN_THETA = Math.tan(THETA);
const EPSILON = 0.000001;

export class Camera {
    constructor(position = [0, 0, -1], target = [0, 0, 0]) {
        this.position = position;
        this.target   = target;
        this.up = [0, 1, 0];

        this.projection     = m4.identity();
        this.view           = m4.identity();
        this.viewProjection = m4.identity();
        this.viewDirty = true;
    }

    changeDisplaySize(width, height) {
        const aspect = width / height;
        this.width = width;
        this.height = height;

        const scale = NUM_TILES_HORIZONTALLY / 2 * SQRT_2;
        const near = 0.1;
        const far  = 100;
        m4.ortho(-scale, scale, -scale/aspect, scale/aspect, near, far, this.projection);
        m4.multiply(this.projection, this.view, this.viewProjection);

        /*
        const fieldOfViewRadians = degToRad(60);
        m4.perspective(fieldOfViewRadians, aspect, 1, 2000, this.projection);
        */
    }

    setPosition(position) {
        if (!isVecSame(position, this.position)) {
            this.position[0] = position[0];
            this.position[1] = position[1];
            this.position[2] = position[2];
            this.viewDirty = true;
        }
    }

    setTarget(target) {
        if (!isVecSame(target, this.target)) {
            this.target[0] = target[0];
            this.target[1] = target[1];
            this.target[2] = target[2];
            this.viewDirty = true;
        }
    }

    updateMatrices() {
        if (this.viewDirty) {
            /*m4.lookAt(this.position, this.target, this.up, this.view);
            m4.inverse(this.view, this.view);*/

            /*
            const pos = [
                Math.cos(Time.time * .1) * 10, 5,
                Math.sin(Time.time * .1) * 10
            ];

            const camera = m4.lookAt(pos, [0, 0, 0], this.up);
            m4.inverse(camera, this.view);

            m4.multiply(this.projection, this.view, this.viewProjection);
            this.viewDirty = false;
             */

            const camera = m4.lookAt(this.position, this.target, this.up);
            m4.inverse(camera, this.view);

            m4.multiply(this.projection, this.view, this.viewProjection);

            console.log('Camera');
            console.log(this.position);
            console.log(this.target);
            console.log(camera);

            this.viewDirty = false;
        }
    }
}

export class IsometricCamera extends Camera {
    constructor(position = [0, 0, 0], distance = 20) {
        super(isometricOffset(distance));
        this.distance = distance;
    }
}

function isometricOffset(distance) {
    return [
        distance,
        distance * TAN_THETA * SQRT_2,
        distance
    ];
}

function isVecSame(a, b) {
    return isScalarSame(a[0], b[0])
        || isScalarSame(a[1], b[1])
        || isScalarSame(a[2], b[2]);
}

function isScalarSame(a, b) {
    return Math.abs(a - b) <= EPSILON;
}
