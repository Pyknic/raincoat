import {Component} from "./component";
import {movingCapsuleIntersectsAABB, OrigoRay} from "./intersect";
import * as twgl from "twgl.js";
const v3 = twgl.v3

export const STATIC_BODY = 'staticBody';

export class StaticBody extends Component {

    /**
     *
     * @param {Spatial} owner
     * @param {AABB} aabb
     */
    constructor(owner, aabb) {
        super(owner);
        this.aabb = aabb;
    }

    typeName() {
        return STATIC_BODY;
    }

    onAdd(renderer) {
        renderer.addObstacle(this.aabb);
    }

    onRemove(renderer) {
        renderer.removeObstacle(this.aabb);
    }
}

const rayForward = new OrigoRay();

/**
 *
 * @param {Capsule} capsule
 * @param {number[]} movement
 * @param {AABB[]} obstacles
 */
export function physicsMove(capsule, movement, obstacles) {
    let minDist = Infinity;

    rayForward.set(movement);

    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        minDist = Math.min(minDist, movingCapsuleIntersectsAABB(capsule, rayForward, obstacle));
    }

    minDist = Math.min(1.0, minDist);

    if (minDist > 0.00001) {
        capsule.position[0] += movement[0] * minDist;
        capsule.position[1] += movement[1] * minDist;
        capsule.position[2] += movement[2] * minDist;
    }
}
