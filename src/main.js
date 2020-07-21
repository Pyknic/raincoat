import {loadPrograms} from "./materials";
import * as twgl from "twgl.js";
import {Renderer} from "./renderer";
import {IsometricCamera} from "./camera";
import {Time} from "./time";
import {readFileSync} from "fs";
import {parseGLTF} from "./gltf";
import {ANIMATOR} from "./animation";
import {Protagonist} from "./protagonist";

let girlGLTF = JSON.parse(readFileSync('src/assets/girl2.gltf', 'utf8'));
let bedroomGLTF = JSON.parse(readFileSync('src/assets/bedroom3.gltf', 'utf8'));

(function main() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    document.body.appendChild(canvas);

    const gl = canvas.getContext('webgl2', {
        'alpha': false
    });

    console.log(`Using ${gl.getParameter(gl.VERSION)}`);
    if (!twgl.isWebGL2(gl)) {
        console.error(`This game requires WebGL2 to run.`);
        return;
    }

    /*
    twgl.setDefaults({
        attribPrefix: 'a_',
    });
    */



    twgl.setAttributePrefix('a_');
    loadPrograms(gl);

    const camera = new IsometricCamera();
    camera.changeDisplaySize(canvas.width, canvas.height);

    const renderer = new Renderer(gl);

    bedroomGLTF = parseGLTF(gl, bedroomGLTF);
    renderer.addGLTF(bedroomGLTF);

    girlGLTF = parseGLTF(gl, girlGLTF);
    let temp = girlGLTF.scenes[0].root.selectOne('Girl');
    console.log('Temp: ');
    console.log(temp);
    temp.addComponent(new Protagonist(temp));

    renderer.addGLTF(girlGLTF);

    let girl = renderer.root.selectOne('Girl');
    //girl.trs.translate([0, 0, 0]);

    //girl.trs.setPosition([0, 0, -1]);
    girl.trs.rotateY(-Math.PI * 0.5);
    girl.trs.setScale([2, 2, 2]);
    girl.trs.translate(twgl.v3.create(0, 0.01, 0));

    //girl.addComponent(new Protagonist(girl));

    console.log(girl);

    //let anim = girl.getComponent(ANIMATOR);
    // let anim = girl.selectOne('Root').getComponent(ANIMATOR);

    //anim.addTransition('Walk', 'Idle', 0.1);
    //anim.addTransition('Idle', 'Walk', 0.1);

    console.log(`Scene contains ${renderer.obstacles.length} obstacle(s).`);

    //console.log(anim);

    Time.previousTime = new Date() * 0.001;
    Time.time = Time.previousTime;

    function step(time) {
        time *= 0.001;
        Time.time = time;
        Time.deltaTime = Time.time - Time.previousTime;

        //girl.trs.rotateY(Time.deltaTime);
        renderer.updateAll();

        //camera.viewDirty = true;
        //camera.updateMatrices();
        renderer.renderAll(camera);

        Time.previousTime = Time.time;
        requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
})();

//const renderer = new Game();
