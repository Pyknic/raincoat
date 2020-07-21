export class TRS {
    constructor(position = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1]) {
        this.position = position;
        this.scale = scale;

        switch (rotation.length) {
            case 3: {
                this.rotation = quatFromEulerZXY(rotation);
                break;
            }
            case 4: {
                this.rotation = rotation;
                break;
            }
            default: throw new Error('Expected rotation to have either 3 or 4 elements.');
        }

        this.setPosition = pos => {
            this.position[0] = pos[0];
            this.position[1] = pos[1];
            this.position[2] = pos[2];
        };

        this.setRotation = rot => {
            switch (rot.length) {
                case 3: {
                    quatFromEulerZXY(rot, this.rotation);
                    break;
                }
                case 4: {
                    this.rotation[0] = rot[0];
                    this.rotation[1] = rot[1];
                    this.rotation[2] = rot[2];
                    this.rotation[3] = rot[3];
                    break;
                }
                default: throw new Error('Expected rotation to have either 3 or 4 elements.');
            }
        };

        this.setScale = scl => {
            this.scale[0] = scl[0];
            this.scale[1] = scl[1];
            this.scale[2] = scl[2];
        };
    }

    translate(xyz) {
        this.position[0] += xyz[0];
        this.position[1] += xyz[1];
        this.position[2] += xyz[2];

        return this;
    }

    getForward(dest=[0, 0, 0]) {
        dest[0] = 0; dest[1] = 0; dest[2] = -1;
        return rotateVector(dest, this.rotation);
    }

    getRight(dest) {
        dest[0] = -1; dest[1] = 0; dest[2] = 0;
        return rotateVector(dest, this.rotation);
    }

    getUp(dest) {
        dest[0] = 0; dest[1] = -1; dest[2] = 0;
        return rotateVector(dest, this.rotation);
    }

    rotateY(radians) {
        const halfR = radians * 0.5;
        const ax = this.rotation[0],
              ay = this.rotation[1],
              az = this.rotation[2],
              aw = this.rotation[3];

        const sinR = Math.sin(halfR),
              cosR = Math.cos(halfR);

        this.rotation[0] = ax * cosR - az * sinR;
        this.rotation[1] = ay * cosR + aw * sinR;
        this.rotation[2] = az * cosR + ax * sinR;
        this.rotation[3] = aw * cosR - ay * sinR;

        return this;
    }

    getMatrix(dest) {
        dest = dest || new Float32Array(16);

        const x = this.rotation[0],
              y = this.rotation[1],
              z = this.rotation[2],
              w = this.rotation[3];

        const x2 = x + x,	y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = this.scale[0], sy = this.scale[1], sz = this.scale[2];

        dest[ 0 ] = (1 - (yy + zz)) * sx;
        dest[ 1 ] = (xy + wz) * sx;
        dest[ 2 ] = (xz - wy) * sx;
        dest[ 3 ] = 0;

        dest[ 4 ] = (xy - wz) * sy;
        dest[ 5 ] = (1 - (xx + zz)) * sy;
        dest[ 6 ] = (yz + wx) * sy;
        dest[ 7 ] = 0;

        dest[ 8 ] = (xz + wy) * sz;
        dest[ 9 ] = (yz - wx) * sz;
        dest[ 10 ] = (1 - (xx + yy)) * sz;
        dest[ 11 ] = 0;

        dest[ 12 ] = this.position[0];
        dest[ 13 ] = this.position[1];
        dest[ 14 ] = this.position[2];
        dest[ 15 ] = 1;

        return dest;
    }
}

function quatFromEulerZXY(euler, dest=[0, 0, 0, 0]) {
    const _x = euler[1] * 0.5;
    const _y = euler[2] * 0.5;
    const _z = euler[0] * 0.5;
    const cX = Math.cos(_x);
    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);
    dest[0] = cX * cY * cZ - sX * sY * sZ;
    dest[1] = sX * cY * cZ - cX * sY * sZ;
    dest[2] = cX * sY * cZ + sX * cY * sZ;
    dest[3] = cX * cY * sZ + sX * sY * cZ;
    return dest;
}

/**
 *
 * @param {number[]} vec   vector with 3 components that is to be rotated (overwritten)
 * @param {number[]} quat  quaternion with 4 components (X, Y, Z, W) where W is the real part
 * @returns {*}  the rotated vector
 */
function rotateVector(vec, quat) {
    const qx = quat[0];
    const qy = quat[1];
    const qz = quat[2];
    const qw = quat[3];

    let uvx = qy * vec[2] - qz * vec[1],
        uvy = qz * vec[0] - qx * vec[2],
        uvz = qx * vec[1] - qy * vec[0];

    let uuvx = qy * uvz - qz * uvy,
        uuvy = qz * uvx - qx * uvz,
        uuvz = qx * uvy - qy * uvx;

    const w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;

    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;

    vec[0] += uvx + uuvx;
    vec[1] += uvy + uuvy;
    vec[2] += uvz + uuvz;

    return vec;
}
