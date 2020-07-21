import {ANIMATOR} from "./animation";
import {Component} from "./component";
import * as twgl from "twgl.js";
import {Time} from "./time";
import {Capsule} from "./intersect";
import {physicsMove} from "./physics";

const v3 = twgl.v3;

const PROTAGONIST = 'protagonist';
const BLEND_TIME = 0.1;

const NORTH = v3.normalize([-1, 0, -1]);
const WEST  = v3.normalize([-1, 0,  1]);
const SOUTH = v3.normalize([ 1, 0,  1]);
const EAST  = v3.normalize([ 1, 0, -1]);

export class Protagonist extends Component {

    /**
     *
     * @param {Spatial} owner
     */
    constructor(owner) {
        super(owner);

        this.walking = false;
        this.targetDir = [0, 0, 0];

        this.walkSpeed = 0.6;
        this.turnSpeed = 0.5;
        this.currentYSpeed = 0.0;

        this.capsule = null;

        const animator = owner.getComponent(ANIMATOR);
        animator.addTransition('Idle', () => this.walking ? 'Walk' : null, BLEND_TIME);
        animator.addTransition('Walk', () => this.walking ? null : 'Idle', BLEND_TIME);
        animator.play('Idle');

        this._northDown = false;
        this._eastDown = false;
        this._southDown = false;
        this._westDown = false;

        this._forward = [0, 0, 1];
        this._right   = [1, 0, 0];

        this._keyDown = ev => {
            switch (ev.key) {
                case 'W': case 'w': this._northDown = true; break;
                case 'A': case 'a': this._westDown = true; break;
                case 'S': case 's': this._southDown = true; break;
                case 'D': case 'd': this._eastDown = true; break;
            }
        };

        this._keyUp = ev => {
            switch (ev.key) {
                case 'W': case 'w': this._northDown = false; break;
                case 'A': case 'a': this._westDown = false; break;
                case 'S': case 's': this._southDown = false; break;
                case 'D': case 'd': this._eastDown = false; break;
            }
        };

        this._update = renderer => {
            if (this.capsule === null) {
                this.capsule = new Capsule(owner.trs.position, 1.3, 0.35);
            }

            v3.mulScalar(this.targetDir, 0.0, this.targetDir);
            this.walking = false;

            if (this._northDown) {
                this.walking = true;
                v3.add(this.targetDir, NORTH, this.targetDir);
            }

            if (this._westDown) {
                this.walking = true;
                v3.add(this.targetDir, WEST, this.targetDir);
            }

            if (this._southDown) {
                this.walking = true;
                v3.add(this.targetDir, SOUTH, this.targetDir);
            }

            if (this._eastDown) {
                this.walking = true;
                v3.add(this.targetDir, EAST, this.targetDir);
            }

            let dist = v3.lengthSq(this.targetDir);
            if (dist > 0.0001) {
                dist = 1.0 / Math.sqrt(dist);
                v3.mulScalar(this.targetDir, dist, this.targetDir);

                this.owner.trs.getForward(this._forward);
                this.owner.trs.getRight(this._right);

                const dotForward = v3.dot(this._forward, this.targetDir);
                const dotRight = v3.dot(this._right, this.targetDir);

                let turn;
                if (dotForward >= 0.0) { // Already somewhat aligned
                    turn = dotRight;
                } else {
                    if (dotRight >= 0.0) {
                        turn = 2.0 - dotRight;
                    } else {
                        turn = -2.0 - dotRight;
                    }
                }

                const moveFactor = this.walkSpeed * Math.max(0.0, dotForward);
                v3.mulScalar(this.targetDir, Time.deltaTime * moveFactor, this.targetDir);

                this.owner.trs.rotateY(turn * this.turnSpeed);

                let previousY = this.capsule.position[1];
                physicsMove(this.capsule, [0, 1, 0], renderer.obstacles);
                let deltaY = this.capsule.position[1] - previousY;
                physicsMove(this.capsule, this.targetDir, renderer.obstacles);
                physicsMove(this.capsule, [0, -deltaY, 0], renderer.obstacles);
                //this.owner.trs.translate(this.targetDir);
            }
        };
    }

    typeName() {
        return PROTAGONIST;
    }

    onAdd(renderer) {
        document.addEventListener('keydown', this._keyDown, false);
        document.addEventListener('keyup', this._keyUp, false);
        renderer.addUpdateable(this._update);
    }

    onRemove(renderer) {
        document.removeEventListener('keydown', this._keyDown, false);
        document.removeEventListener('keyup', this._keyUp, false);
        renderer.removeUpdateable(this._update);
    }
}
