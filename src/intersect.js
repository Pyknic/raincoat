import * as twgl from "twgl.js";
const v3 = twgl.v3;

const EPSILON = 0.0001;

export class AABB {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    minusAABB(other, dest) {
        // v3.subtract(this.min, other.max, dest.min);
        // v3.subtract(this.max, other.min, dest.max);

        for (let i = 0; i < 3; i++) {
            const min = other.min[i] - this.max[i];
            const max = other.max[i] - this.min[i];
            dest.min[i] = min;
            dest.max[i] = max;
        }
        //
        // let min0 = other.min[0] - this.max[0];
        // let max0 = other.max[0] - this.min[0];
        // let min1 = other.min[1] - this.max[1];
        // let max1 = other.max[1] - this.min[1];
        // let max2 = other.max[2] - this.min[2];
        // let min2 = other.min[2] - this.max[2];
        // dest.min[0] = min0;
        // dest.min[1] = min1;
        // dest.min[2] = min2;
        // dest.max[0] = min0;
        // dest.max[1] = min1;
        // dest.max[2] = min2;
        //
        // v3.subtract(this.min, other.max, dest.min);
        // v3.subtract(this.max, other.min, dest.max);
        //v3.negate(this.min, this.min);
        //v3.negate(this.max, this.max);
        return dest;
    }
}

export class Sphere {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
}

export class Capsule {
    constructor(position, height, radius) {
        this.position = position;
        this.height   = height;
        this.radius   = radius;
    }

    toAABB(dest) {
        const r = this.radius;
        dest.min[0] = this.position[0] - r;
        dest.min[1] = this.position[1];
        dest.min[2] = this.position[2] - r;
        dest.max[0] = this.position[0] + r;
        dest.max[1] = this.position[1] + this.height;
        dest.max[2] = this.position[2] + r;
        return dest;
    }

    getHeadCenter(dest) {
        let h = this.height - this.radius;
        dest[0] = this.position[0];
        dest[1] = this.position[1] + h;
        dest[2] = this.position[2];
        return dest;
    }

    getTailCenter(dest) {
        dest[0] = this.position[0];
        dest[1] = this.position[1] + this.radius;
        dest[2] = this.position[2];
        return dest;
    }
}

export class OrigoRay {
    constructor() {
        this.vec = v3.create();
        this.inv = v3.create();
        this.unitVec = v3.create();
    }

    setX(x) {
        this.vec[0] = x;
        this.inv[0] = 1 / x;
        this._updateLengthAndUnitVec();
        return this;
    }

    setY(y) {
        this.vec[1] = y;
        this.inv[1] = 1 / y;
        this._updateLengthAndUnitVec();
        return this;
    }

    setZ(z) {
        this.vec[2] = z;
        this.inv[2] = 1 / z;
        this._updateLengthAndUnitVec();
        return this;
    }

    set(vec) {
        v3.copy(vec, this.vec);
        this.inv[0] = 1 / this.vec[0];
        this.inv[1] = 1 / this.vec[1];
        this.inv[2] = 1 / this.vec[2];
        this._updateLengthAndUnitVec();
        return this;
    }

    _updateLengthAndUnitVec() {
        this.length = v3.length(this.vec);
        this.unitVec = v3.mulScalar(this.vec, 1.0 / this.length, this.unitVec);
    }

    get(i) {
        return this.vec[i];
    }

    getInv(i) {
        return this.inv[i];
    }

    distanceToAABB(aabb) {
        let t0 = -Infinity;
        let t1 = +Infinity;

        for (let i = 0; i < 3; i++) {
            const dInv = this.inv[i];
            let tMin = (aabb.min[i]) * dInv;
            let tMax = (aabb.max[i]) * dInv;

            if (tMin > tMax) {
                const tmp = tMin;
                tMin = tMax;
                tMax = tmp;
            }

            if (tMax < t0 || tMin > t1) {
                return Infinity
            }

            if (tMin > t0) t0 = tMin;
            if (tMax < t1) t1 = tMax;
        }

        if (t0 < 0) t0 = Infinity;
        return t0 > t1 ? Infinity : t0;
    }

    distanceToSphere(sphere) {
        const c = sphere.center;
        const r = sphere.radius;
        const lDotC = 0.0 - this.unitVec[0] * c[0] - this.unitVec[1] * c[1] - this.unitVec[2] * c[2];
        const delta = lDotC * lDotC - v3.lengthSq(c) + r * r;

        if (delta < 0.0) return Infinity;

        const sqrtDelta = Math.sqrt(delta);
        let tMin = -lDotC - sqrtDelta;
        let tMax = -lDotC + sqrtDelta;
        if (tMin > tMax) {
            const tmp = tMin;
            tMin = tMax;
            tMax = tmp;
        }

        if (tMin >= 0.0 && tMin < this.length)
            return tMin / this.length;

        return Infinity;
    }

    distanceToAACylinder(axisIdx, from, axisMax, radius) {
        let tMin = 0.0, tMax = 1.0;
        const dInv = this.inv[axisIdx];
        const d    = this.vec[axisIdx];
        const axisMin = from[axisIdx];
        if (d < -EPSILON) { // Pointing in the negative direction
            if (d > axisMax) return Infinity;
            tMin = Math.max(tMin, axisMax * dInv);
            tMax = Math.min(tMax, axisMin * dInv);
        } else if (d > EPSILON) {
            if (d < axisMin) return Infinity;
            tMin = Math.max(tMin, axisMin * dInv);
            tMax = Math.min(tMax, axisMax * dInv);
        } // Ray is orthogonal to the axis

        const u = (axisIdx + 1) % 3;
        const v = (axisIdx + 2) % 3;

        const c = from;
        const r = radius;
        const lDotC = 0.0 - this.unitVec[u] * c[u] - this.unitVec[v] * c[v];
        const delta = lDotC * lDotC - c[u] * c[u] - c[v] * c[v] + r * r;

        if (delta < 0.0) return Infinity;
        const sqrtDelta = Math.sqrt(delta);
        tMin = Math.max(tMin, -lDotC - sqrtDelta);
        tMax = Math.min(-lDotC + sqrtDelta);

        if (tMin > tMax) {
            const tmp = tMin;
            tMin = tMax;
            tMax = tmp;
        }

        if (tMin >= 0.0 && tMin < this.length)
            return tMin / this.length;

        return Infinity;
    }
}

export class CollisionResult {
    constructor() {
        this.tMin = 0.0;
        this.tMax = 1.0;
    }
}

const tempVec = v3.create();
const tempAABB = new AABB(v3.create(), v3.create());
const tempSphere = new Sphere(v3.create(), 0.0);

/**
 * Returns the distance we could move the specified capsule in the direction of a ray going
 * in the opposite direction than the one specified without intersecting the specified
 * axis-aligned bounding box. The distance is specified in units of ray-lengths. The ray is
 * given in the negated form so that it can be compared directly with the Minkowski Difference.
 * If no intersection will occur for the range of the ray, {@code Infinity} is returned.
 *
 * @param {Capsule} capsule      the moving capsule
 * @param {OrigoRay} negatedRay  ray representing the movement, but specified in negated coordinates
 * @param aabb {AABB}            the collision obstacle as an axis-aligned bounding box
 * @returns {number}             distance that the capsule can move, or {@code Infinity}
 */
export function movingCapsuleIntersectsAABB(capsule, negatedRay, aabb) {

    // Begin by computing a Minkowski Difference of the AABB and the outer bounds of the capsule
    capsule.toAABB(tempAABB);
    tempAABB.minusAABB(aabb, tempAABB); // Minkowski Difference

    // If it does not intersect the negated ray, there is no collision
    const roughHit = negatedRay.distanceToAABB(tempAABB);

    if (Infinity === roughHit)
        return Infinity;

    return roughHit;
/*
    let minDist = Infinity; // The nearest distance in units of 'negatedRay-lengths'

    // Squeeze the AABB along the axes one at a time by the radius of the capsule to test if
    // it collides with the sides of the rounded cube.
    const r = capsule.radius;
    tempAABB.min[0] += r; tempAABB.max[0] -= r;
    minDist = Math.min(minDist, negatedRay.distanceToAABB(tempAABB));
    tempAABB.min[0] -= r; tempAABB.max[0] += r;
    tempAABB.min[1] += r; tempAABB.max[1] -= r;
    minDist = Math.min(minDist, negatedRay.distanceToAABB(tempAABB));
    tempAABB.min[1] -= r; tempAABB.max[1] += r;
    tempAABB.min[2] += r; tempAABB.max[2] -= r;
    minDist = Math.min(minDist, negatedRay.distanceToAABB(tempAABB));
    tempAABB.min[0] += r; tempAABB.max[0] -= r;
    tempAABB.min[1] += r; tempAABB.max[1] -= r;

    // We won't gain anything from checking the corners and edges since we are already as close
    // as we can get.
    if (roughHit + EPSILON >= minDist) return minDist;

    tempSphere.radius = r;

    // Put a sphere at each corner of the squeezed AABB. If the sphere is closer to the origin
    // than the current minDist, compute the actual distance.
    for (let i = 0; i < 8; i++) {
        tempSphere.center[0] = ((i & 1) !== 0) ? tempAABB.min[0] : tempAABB.max[0];
        tempSphere.center[1] = ((i & 2) !== 0) ? tempAABB.min[1] : tempAABB.max[1];
        tempSphere.center[2] = ((i & 4) !== 0) ? tempAABB.min[2] : tempAABB.max[2];
        if (v3.lengthSq(tempSphere.center) - r < minDist)
            minDist = Math.min(minDist, negatedRay.distanceToSphere(tempSphere));
    }

    // Walk the edges of the AABB in a order to minimize state changes. See if a cylinder placed
    // at the edge results in a closer hit.

    // X = 0, Y = 0, Z = 0
    tempVec[0] = tempAAA.min[0];
    tempVec[1] = tempAAA.min[1];
    tempVec[2] = tempAAA.min[2];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(0, tempVec, tempAABB.max[0], r));
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(1, tempVec, tempAABB.max[1], r));
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(2, tempVec, tempAABB.max[2], r));

    // X = 0, Y = 0, Z = 1
    tempVec[2] = tempAAA.max[2];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(0, tempVec, tempAABB.max[0], r));
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(1, tempVec, tempAABB.max[1], r));

    // X = 0, Y = 1, Z = 1
    tempVec[1] = tempAAA.max[1];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(0, tempVec, tempAABB.max[0], r));

    // X = 0, Y = 1, Z = 0
    tempVec[2] = tempAAA.min[2];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(0, tempVec, tempAABB.max[0], r));
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(2, tempVec, tempAABB.max[2], r));

    // X = 1, Y = 1, Z = 0
    tempVec[0] = tempAAA.max[0];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(2, tempVec, tempAABB.max[2], r));

    // X = 1, Y = 0, Z = 0
    tempVec[1] = tempAAA.min[1];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(1, tempVec, tempAABB.max[1], r));
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(2, tempVec, tempAABB.max[2], r));

    // X = 1, Y = 0, Z = 1
    tempVec[2] = tempAAA.max[2];
    minDist = Math.min(minDist, negatedRay.distanceToAACylinder(1, tempVec, tempAABB.max[1], r));

    return minDist; // Compare with Infinity to see if there was an intersection
    */
}
