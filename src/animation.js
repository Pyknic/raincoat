import {Time} from "./time";
import {Component} from "./component";

export const ANIMATOR = 'animator';

const KEYFRAMES_PER_SECOND = 6;
const ONE_KEYFRAME = 1 / KEYFRAMES_PER_SECOND;

/**
 * An {@code Animator} is a {@code Component} that handles multiple animations. You can play, pause and blend between
 * animations.
 */
export class Animator extends Component {

    /**
     *
     * @param {Spatial} owner  the spatial that holds the Animator component
     */
    constructor(owner) {
        super(owner);
        this.animations   = {};
        this.transitions  = {};
        this.currentName  = null;
        this.nextName     = null;
        this.localTime    = 0.0;
        this.localEndTime = 0.0;
        this.paused       = false;
        this.speed        = 1.0;

        this.update = renderer => {
            if (this.paused || this.currentName === null) return;

            let anim = this.animations[this.currentName];
            let next = this.nextName && this.animations[this.nextName];
            let transition = this.transitions[this.currentName];

            this.localTime += Time.deltaTime * this.speed;
            if (this.localTime < anim.startsAt)
                this.localTime = anim.startsAt;

            if (!next) { // No animation is queued up after this one.
                if (transition) {
                    if (anim.interrupt || this.localTime > anim.endsAt - transition.duration) {

                    //if (this.localTime > anim.endsAt - transition.duration) {
                        this.nextName = transition.next();

                        // TODO: Transitions should trigger immediately as the function returns something != 0.

                        if (this.nextName) {
                            if (typeof(this.animations[this.nextName]) !== 'undefined') {
                                next = this.animations[this.nextName];
                                if (this.localTime > anim.endsAt - transition.duration) {
                                    this.localEndTime = anim.endsAt;
                                } else {
                                    this.localEndTime = this.localTime + transition.duration;
                                }
                            } else {
                                throw new Error(`Failed to transition from '${this.currentName}' into 
                                    '${this.nextName}' since such animation doesn't exist.`);
                            }
                        } else if (this.localTime > anim.endsAt - transition.duration) {
                            // Regular loop
                            if (anim.looping) {
                                this.localTime = anim.startsAt;
                            } else {
                                this.localTime = anim.endsAt;
                            }

                            this.nextName = null;
                            next = null;
                        }
                    } // Not yet time to transition
                } else if (this.localTime >= anim.endsAt) {
                    if (anim.looping) {
                        this.localTime = anim.startsAt;
                    } else {
                        this.localTime = anim.endsAt;
                    }
                    this.nextName = null;
                    next = null;
                }
            }

            if (next) { // There is already a next animation queued up
                if (transition) {

                    let blend; // Value between 0 and 1 that defines where in the transition we are
                    if (this.localTime >= this.localEndTime) {
                        blend = 1.0;
                    } else {
                        let blendBegin = this.localEndTime - transition.duration;
                        if (this.localTime <= blendBegin) {
                            blend = 0.0;
                        } else if (transition.duration > 0.0) {
                            blend = (this.localTime - blendBegin) / transition.duration;
                        } else {
                            blend = 1.0;
                        }
                    }

                    let blendChannels = {}; // HashMap between the unique name+path of a channel and the channel pair
                    anim.channels.forEach(channel => {
                        blendChannels[channel.uniqueName] = {
                            from: channel,
                            to: null
                        };
                    });

                    next.channels.forEach(channel => {
                        let found = blendChannels[channel.uniqueName];
                        if (found) found.to = channel;
                        else {
                            blendChannels[channel.uniqueName] = {
                                from: null,
                                to: channel
                            };
                        }
                    });

                    let thatTime = next.startsAt + transition.duration * blend;
                    if (thatTime > next.endsAt) thatTime = next.endsAt; // For single-frame animations and such

                    for (let [uniqueName, channelPair] of Object.entries(blendChannels)) {
                        if (channelPair.from && channelPair.to) {
                            channelPair.from.updateBlended(channelPair.to, this.localTime, thatTime, blend);
                        } else if (channelPair.from) { // Only from
                            channelPair.from.update(this.localTime);
                        } else { // Only to
                            channelPair.to.update(thatTime);
                        }
                    }

                    if (blend >= 1.0) {
                        this.currentName = this.nextName;
                        this.nextName = null;
                        this.localTime = next.startsAt;
                    }

                    return;
                }
            }

            anim.channels.forEach(channel => {
                channel.update(this.localTime);
            });
        };
    }

    typeName() {
        return ANIMATOR;
    }

    play(name) {
        let animation = this.animations[name];
        if (!animation) throw new Error(`Unknown animation with name '${name}'`);
        this.currentName = name;
        this.nextName = null;
        this.localTime = animation.startsAt;
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    /**
     * Adds a transition that could occur after the specified {@code fromName} animation. If {@code toName} is a
     * {@code string}, then it will trigger immediately after the {@code fromName} animation has finished, minus the
     * duration time. If {@code toName} is a {@code function}, then the function will be invoked each step of the
     * animation and if it returns something that is not {@code null}, then that will be interpreted as the name of the
     * animation to blend into.
     *
     * @param {string} fromName         name of the {@code Animation} to transition from
     * @param {string|function} toName  name or function returning a name of the {@code Animation} to transition to
     * @param {number} duration         seconds for the blending to last
     */
    addTransition(fromName, toName, duration=0) {
        this.transitions[fromName] = new Transition(toName, duration);
    }

    /**
     * Adds an animation to this animator.
     *
     * @param {Animation} animation  the animation to add
     */
    addAnimation(animation) {
        this.animations[animation.name] = animation;
    }

    onAdd(renderer) {
        renderer.addUpdateable(this.update);
    }

    onRemove(renderer) {
        renderer.removeUpdateable(this.update);
    }
}

class Transition {
    constructor(target, duration) {
        let targetType = typeof(target);
        if (targetType === 'string') {
            this.next = () => target;
        } else if (targetType === 'function') {
            this.next = target;
        } else {
            throw new Error(`Target '${target}' has an unsupported type '${targetType}'`)
        }

        this.duration = duration;
    }
}

/**
 * An {@code Animation} is a single motion that spans multiple properties in multiple spatials, stored in different
 * {@code AnimationChannels}.
 */
export class Animation {

    /**
     *
     * @param {string} name
     * @param {AnimationChannel[]} channels
     */
    constructor(name, channels) {
        this.name = name;
        this.channels = channels;

        this.interrupt = true;
        this.looping   = true;

        this.startsAt = channels[0].startsAt;
        this.endsAt   = channels[0].endsAt;
        this.duration = channels[0].duration;
    }

    /**
     *
     * @param {AnimationChannel} channel
     */
    addChannel(channel) {
        this.channels.push(channel);

        let start = channel.startsAt;
        // let start = channel.startsAt - ONE_KEYFRAME;
        if (start < this.startsAt) {
            this.startsAt = start;
        }

        let end = channel.endsAt;
        if (end > this.endsAt) {
            this.endsAt = end;
        }
    }
}

export class AnimationChannel {
    constructor(spatial, path, sampler) {
        this.sampler = sampler;
        this.uniqueName = `${spatial.uniqueName()}#${path}`;
        switch (path) {
            case 'translation': {
                this.setter = spatial.trs.setPosition;
                this.tempVec4 = [0, 0, 0];

                switch (sampler.interpolatorName) {
                    case 'STEP': sampler.makeStep(); break;
                    case 'LINEAR': sampler.makeVectorLerp(); break;
                    default: {
                        throw new Error(`Unsupported interpolation type ${sampler.interpolatorName} for path '${path}'`);
                    }
                }
                
                break;
            }
            case 'rotation': {
                this.setter = spatial.trs.setRotation;
                this.tempVec4 = [0, 0, 0, 0];

                switch (sampler.interpolatorName) {
                    case 'STEP': sampler.makeStep(); break;
                    case 'LINEAR': sampler.makeQuaternionSlerp(); break;
                    default: {
                        throw new Error(`Unsupported interpolation type ${sampler.interpolatorName} for path '${path}'`);
                    }
                }

                break;
            }
            case 'scale': {
                this.setter = spatial.trs.setScale;
                this.tempVec4 = [0, 0, 0];

                switch (sampler.interpolatorName) {
                    case 'STEP': sampler.makeStep(); break;
                    case 'LINEAR': sampler.makeVectorLerp(); break;
                    default: {
                        throw new Error(`Unsupported interpolation type ${sampler.interpolatorName} for path '${path}'`);
                    }
                }

                break;
            }
            case 'weights': {
                throw new Error(`Morph targets are not implemented yet.`);
            }
            default: {
                throw new Error(`Unknown animation channel path '${path}'`);
            }
        }
    }

    get keyFrameCount() {
        return this.sampler.keyFrameCount;
    }

    get startsAt() {
        return this.sampler.firstTime();
    }

    get endsAt() {
        return this.sampler.lastTime();
    }

    get duration() {
        return this.endsAt - this.startsAt;
    }

    update(time) {
        const t = Math.floor((time - this.startsAt) / (this.duration + 0.0001) * this.keyFrameCount);
        this.sampler.sampleAt(time, this.tempVec4);
        this.setter(this.tempVec4);
    }

    /**
     * Sets the spatial to a combination of the sampled state from this channel and another channel. Caller must make
     * sure that both channels refer to the same spatial, otherwise the behavior is undefined.
     *
     * @param {AnimationChannel} otherChannel  the other channel to include in the blend
     * @param {number} thisTime  local time (between {@code startsAt} and {@code endsAt}) to sample this channel at
     * @param {number} thatTime  local time (between {@code startsAt} and {@code endsAt}) to sample the other channel at
     * @param {number} factor    influence in the range 0..1 where 0 is 100% this and 1 is 100% the other channel
     */
    updateBlended(otherChannel, thisTime, thatTime, factor) {
        //throw new Error('Temporarily disabled...');
        const that = otherChannel;
        if (this === that) throw new Error(`Can't blend between an animation and itself.`);
        const t0 = Math.floor((thisTime - this.startsAt) / (this.duration + 0.0001) * this.keyFrameCount);
        const t1 = Math.floor((thatTime - that.startsAt) / (that.duration + 0.0001) * that.keyFrameCount);
        this.sampler.sampleAt(t0, this.tempVec4);
        that.sampler.sampleAt(t1, that.tempVec4);

        this.sampler.interpolator.interpolateValues(
            this.tempVec4, factor,
            this.tempVec4[0],
            this.tempVec4[1],
            this.tempVec4[2],
            this.tempVec4.length > 3 ? this.tempVec4[3] : 0.0,
            that.tempVec4[0],
            that.tempVec4[1],
            that.tempVec4[2],
            that.tempVec4.length > 3 ? that.tempVec4[3] : 0.0,
        );

        this.setter(this.tempVec4);
    }
}

export class AnimationSampler {

    /**
     * Creates a new AnimationSampler.
     *
     * @param {Float32Array} timestamps  represents float timestamps when the keyframes occur
     * @param {Float32Array} values      representing vec4 values at those timestamps
     */
    constructor(timestamps, values, interpolatorName) {
        if (timestamps.byteLength * 4 !== values.byteLength
        &&  timestamps.byteLength * 3 !== values.byteLength) {
            throw new Error(`Timestamp byteLength = ${timestamps.byteLength} while values byteLength = ${values.byteLength}`);
        }

        this.outputSize       = values.byteLength / timestamps.byteLength;
        this.timestamps       = timestamps;
        this.values           = values;
        this.interpolatorName = interpolatorName;
        this.interpolator     = null;
    }

    get keyFrameCount() {
        return this.timestamps.length;
    }

    makeStep() {
        this.interpolator = new Step(this.values, this.outputSize);
    }

    makeVectorLerp() {
        this.interpolator = new VectorLerp(this.values, this.outputSize);
    }

    makeQuaternionSlerp() {
        this.interpolator = new QuaternionSlerp(this.values, this.outputSize);
    }

    firstTime() {
        return this.timestamps[0];
    }

    lastTime() {
        return this.timestamps[this.lastIdx()];
    }

    lastIdx() {
        return this.timestamps.length - 1;
    }

    copyValue(idx, dest) {
        for (let i = 0; i < dest.length; i++) {
            dest[i] = this.values[idx * this.outputSize + i];
        }
    }

    sampleAt(relativeTime, dest) {
        let previousTime = this.firstTime();
        if (relativeTime <= previousTime) {
            const x = (relativeTime - (previousTime - ONE_KEYFRAME)) / ONE_KEYFRAME;
            this.interpolator.interpolate(this.lastIdx(), 0, x, dest);
        } else {
            const lastIdx = this.lastIdx();
            for (let i = 1; i <= lastIdx; i++) {
                const time = this.timestamps[i];
                if (relativeTime <= time) {
                    const x = (relativeTime - previousTime) / (time - previousTime);
                    this.interpolator.interpolate(i - 1, i, x, dest);
                    return;
                }
                previousTime = time;
            }

            this.copyValue(this.lastIdx(), dest);
        }
    }

    sampleAtFrame(frameIdx, dest) {
        this.copyValue(frameIdx, dest);
    }
}

class Interpolator {
    /**
     * Abstract constructor.
     *
     * @param {Float32Array} values
     * @param {number} outputSize
     */
    constructor(values, outputSize) {
        this.values = values;
        this.outputSize = outputSize;
    }

    /**
     * Writes the interpolated value between the two indexes at relative time {@code t} to the specified destination.
     *
     * @param {number} fromIdx  the index of the first keyframe
     * @param {number} toIdx    the index of the second keyframe
     * @param {number} t        the time, ranging from 0 to 1
     * @param {number[]} dest   array to write the interpolated value to
     */
    interpolate(fromIdx, toIdx, t, dest) {}

    /**
     * Writes the interpolated value between the two vectors at relative time {@code t} to the specified destination.
     *
     * @param {number[]} dest  array to write the interpolated value to
     * @param {number} t       the time, ranging from 0 to 1
     * @param {number} ax      first component in the {@code from}-vector
     * @param {number} ay      second component in the {@code from}-vector
     * @param {number} az      third component in the {@code from}-vector
     * @param {number} aw      fourth component in the {@code from}-vector
     * @param {number} bx      first component in the {@code to}-vector
     * @param {number} by      second component in the {@code to}-vector
     * @param {number} bz      third component in the {@code to}-vector
     * @param {number} bw      fourth component in the {@code to}-vector
     */
    interpolateValues(dest, t, ax, ay, az, aw, bx, by, bz, bw) {}
}

class Step extends Interpolator {
    constructor(values, outputSize) {
        super(values, outputSize);
    }

    interpolateValues(dest, t, ax, ay, az, aw, bx, by, bz, bw) {
        if (t < 0.5) {
            dest[0] = ax;
            dest[1] = ay;
            dest[2] = az;
            if (dest.length > 3) dest[3] = aw;
        } else {
            dest[0] = bx;
            dest[1] = by;
            dest[2] = bz;
            if (dest.length > 3) dest[3] = bw;
        }
    }

    interpolate(fromIdx, toIdx, t, dest) {
        const idx = t < 0.5 ? fromIdx : toIdx;
        for (let i = 0; i < dest.length; i++) {
            dest[i] = this.values[idx * this.outputSize + i];
        }
    }
}

class VectorLerp extends Interpolator {
    constructor(values, outputSize) {
        super(values, outputSize);
    }

    interpolateValues(dest, t, ax, ay, az, aw, bx, by, bz, bw) {
        dest[0] = ax + t * (bx - ax);
        dest[1] = ay + t * (by - ay);
        dest[2] = az + t * (bz - az);
        if (dest.length > 3) dest[3] = aw + t * (bw - aw);
    }

    interpolate(fromIdx, toIdx, t, dest) {
        if (this.outputSize > 3) {
            this.interpolateValues(dest, t,
                this.values[fromIdx * this.outputSize],
                this.values[fromIdx * this.outputSize + 1],
                this.values[fromIdx * this.outputSize + 2],
                this.values[fromIdx * this.outputSize + 3],
                this.values[toIdx * this.outputSize],
                this.values[toIdx * this.outputSize + 1],
                this.values[toIdx * this.outputSize + 2],
                this.values[toIdx * this.outputSize + 3]
            );
        } else {
            this.interpolateValues(dest, t,
                this.values[fromIdx * this.outputSize],
                this.values[fromIdx * this.outputSize + 1],
                this.values[fromIdx * this.outputSize + 2],
                0.0,
                this.values[toIdx * this.outputSize],
                this.values[toIdx * this.outputSize + 1],
                this.values[toIdx * this.outputSize + 2],
                0.0
            );
        }
    }
}

class QuaternionSlerp extends Interpolator {
    constructor(values, outputSize) {
        super(values, outputSize);
        if (this.outputSize !== 4) {
            throw new Error(`Expected quaternion output to be 4, but was ${this.outputSize}`);
        }
    }

    interpolateValues(dest, t, ax, ay, az, aw, bx, by, bz, bw) {
        // Inspired by: https://github.com/toji/gl-matrix/blob/master/src/quat.js

        let omega, cosom, sinom, scale0, scale1;
        cosom = ax * bx + ay * by + az * bz + aw * bw;

        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }

        if (1.0 - cosom > 0.00001) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        dest[0] = scale0 * ax + scale1 * bx;
        dest[1] = scale0 * ay + scale1 * by;
        dest[2] = scale0 * az + scale1 * bz;
        dest[3] = scale0 * aw + scale1 * bw;
    }

    interpolate(fromIdx, toIdx, t, dest) {
        let ax = this.values[fromIdx * 4],
            ay = this.values[fromIdx * 4 + 1],
            az = this.values[fromIdx * 4 + 2],
            aw = this.values[fromIdx * 4 + 3];

        let bx = this.values[toIdx * 4],
            by = this.values[toIdx * 4 + 1],
            bz = this.values[toIdx * 4 + 2],
            bw = this.values[toIdx * 4 + 3];

        this.interpolateValues(dest, t, ax, ay, az, aw, bx, by, bz, bw);
    }
}
