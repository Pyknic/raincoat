import * as twgl from "twgl.js";

export class DirectionalLight {
    constructor(position, direction) {
        this.position = position;
        this.direction = direction;
        this.locations = {};
        this.range     = 100.0;

        this.projection     = twgl.m4.identity();
        this.view           = twgl.m4.identity();
        this.viewProjection = twgl.m4.identity();
        this.viewDirty = true;
    }

    setUniforms(gl, program) {
        let loc;
        if (typeof(this.locations[program]) === 'undefined') {
            loc = gl.getUniformLocation(program, 'u_lightDirection');
        } else {
            loc = this.locations[program];
        }

        if (loc) {
            let dir = this.direction;
            gl.uniform3f(loc, dir[0], dir[1], dir[2]);
        }
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

    updateMatrices() {
        if (this.viewDirty) {
            //const camera = twgl.m4.lookAt(this.position, this.position + this.direction, [0, 1, 0]);
            const lightX = twgl.v3.cross([0, -1, 0], this.direction);
            const lightY = twgl.v3.cross(lightX, this.direction);
            const lightZ = this.direction;
            const pos = this.position;
            let camera = Float32Array.from([
                lightX[0], lightX[1], lightX[2], 0.0,
                lightY[0], lightY[1], lightY[2], 0.0,
               -lightZ[0],-lightZ[1],-lightZ[2], 0.0,
                pos[0], pos[1], pos[2], 1.0
            ]);

            const target = twgl.v3.add(this.position, this.direction);
            camera = twgl.m4.lookAt(this.position, target, [0, 1, 0], camera);

            console.log('Light');
            console.log(this.position);
            console.log(this.direction);
            console.log(camera);

            const scale = 3.0;
            twgl.m4.inverse(camera, this.view);
            //twgl.m4.copy(camera, this.view);
            twgl.m4.ortho(-scale, scale, -scale, scale, 0.1, this.range, this.projection);
            twgl.m4.multiply(this.projection, this.view, this.viewProjection);
            this.viewDirty = false;
        }
    }
}
