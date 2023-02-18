import * as THREE from 'three';
import { TrackballControls } from 'three-trackballcontrols';
import { DragControls } from 'three-dragcontrols';
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three-meshline';

const JOINT_RADIUS = 4.0;

const joint_names = [
    'nose',
    'neck',
    'right shoulder',
    'right elbow',
    'right wrist',
    'left shoulder',
    'left elbow',
    'left wrist',
    'right hip',
    'right knee',
    'right ancle',
    'left hip',
    'left knee',
    'left ancle',
    'right eye',
    'left eye',
    'right ear',
    'left ear'
];

const joint_colors = [
    // r  g  b
    [255, 0, 0],    // 0:  nose
    [255, 85, 0],   // 1:  neck
    [255, 170, 0],  // 2:  right shoulder
    [255, 255, 0],  // 3:  right elbow
    [170, 255, 0],  // 4:  right wrist
    [85, 255, 0],   // 5:  left shoulder
    [0, 255, 0],    // 6:  left elbow
    [0, 255, 85],   // 7:  left wrist
    [0, 255, 170],  // 8:  right hip
    [0, 255, 255],  // 9:  right knee
    [0, 170, 255],  // 10: right ancle
    [0, 85, 255],   // 11: left hip
    [0, 0, 255],    // 12: left knee
    [85, 0, 255],   // 13: left ancle
    [170, 0, 255],  // 14: right eye
    [255, 0, 255],  // 15: left eye
    [255, 0, 170],  // 16: right ear
    [255, 0, 85]    // 17: left ear
];

const limb_pairs = [
    [1, 2],   // 0:  right shoulder
    [1, 5],   // 1:  left shoulder
    [2, 3],   // 2:  right upper arm
    [3, 4],   // 3:  right forearm
    [5, 6],   // 4:  left upper arm
    [6, 7],   // 5:  left forearm
    [1, 8],   // 6:  right hip
    [8, 9],   // 7:  right upper leg
    [9, 10],  // 8:  right lower leg
    [1, 11],  // 9:  left hip
    [11, 12], // 10: left upper leg
    [12, 13], // 11: left lower leg
    [1, 0],   // 12: neck
    [0, 14],  // 13: right eye
    [14, 16], // 14: right ear
    [0, 15],  // 15: left eye
    [15, 17], // 16: left ear
];

const standard_pose = [
    //   x      y      z ∈ [0,1]
    [0.500, 0.820, 0.000],  // 0:  nose
    [0.500, 0.750, 0.000],  // 1:  neck
    [0.416, 0.754, 0.000],  // 2:  right shoulder
    [0.305, 0.754, 0.000],  // 3:  right elbow
    [0.188, 0.754, 0.000],  // 4:  right wrist
    [0.584, 0.750, 0.000],  // 5:  left shoulder
    [0.695, 0.750, 0.000],  // 6:  left elbow
    [0.812, 0.750, 0.000],  // 7:  left wrist
    [0.447, 0.511, 0.000],  // 8:  right hip
    [0.453, 0.295, 0.000],  // 9:  right knee
    [0.445, 0.109, 0.000],  // 10: right ancle
    [0.553, 0.511, 0.000],  // 11: left hip
    [0.547, 0.295, 0.000],  // 12: left knee
    [0.555, 0.109, 0.000],  // 13: left ancle
    [0.480, 0.848, 0.000],  // 14: right eye
    [0.520, 0.848, 0.000],  // 15: left eye
    [0.450, 0.834, 0.000],  // 16: right ear
    [0.550, 0.834, 0.000]   // 17: left ear
]

for (let xyz of standard_pose) {
    xyz[0] = xyz[0] - 0.5; // [0,1] -> [-0.5,0.5]
    xyz[1] = xyz[1] - 0.5; // [0,1] -> [-0.5,0.5]
    //xyz[2] = xyz[2] * 2 - 1.0;
}

function create_body(unit, z0) {
    const joints = [];
    const limbs = [];

    for (let i = 0; i < standard_pose.length; ++i) {
        const [x, y, z] = standard_pose[i];
        const [r, g, b] = joint_colors[i];
        const color = (r << 16) | (g << 8) | (b << 0);
        const geom = new THREE.SphereGeometry(JOINT_RADIUS, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const joint = new THREE.Mesh(geom, mat);
        joint.name = joint_names[i];
        joint.position.x = x * unit;
        joint.position.y = y * unit;
        joint.position.z = z + z0;
        joints.push(joint);
    }

    for (let i = 0; i < limb_pairs.length; ++i) {
        const [from_idx, to_idx] = limb_pairs[i];
        const [r, g, b] = joint_colors[i];
        const color = (r << 16) | (g << 8) | (b << 0);
        const line = new MeshLine();
        const mat = new MeshLineMaterial({ color: color });
        limbs.push(new THREE.Mesh(line, mat));
    }

    return [joints, limbs];
}

function init_3d() {
    const
        canvas = document.querySelector('#main_canvas'),
        notation = document.querySelector('#notation'),
        width = canvas.width,
        height = canvas.height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, width * 4);
    camera.position.z = width * 2;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);

    const [joints, limbs] = create_body(width, -5);
    for (let joint of joints) scene.add(joint);
    for (let limb of limbs) scene.add(limb);

    const objects = [];
    for (let joint of joints) objects.push(joint);

    const controls = new TrackballControls(camera, renderer.domElement);
    const dragger = new DragControls(joints, camera, renderer.domElement);
    dragger.addEventListener('dragstart', () => { controls.enabled = false; });
    dragger.addEventListener('dragend', () => { controls.enabled = true; });

    const rc = new THREE.Raycaster();
    const m = new THREE.Vector2();
    renderer.domElement.addEventListener('mousemove', e => {
        e.preventDefault();
        m.x = ((e.clientX - renderer.domElement.offsetLeft) / width) * 2 - 1;
        m.y = (-(e.clientY - renderer.domElement.offsetTop) / height) * 2 + 1;
        rc.setFromCamera(m, camera);
        const touched = rc.intersectObjects(objects);

        // show label
        if (touched.length != 0) {
            notation.textContent = touched[0].object.name;
            notation.style.left = `${e.clientX}px`;
            notation.style.top = `${e.clientY}px`;
            notation.style.display = 'block';
        } else {
            notation.textContent = '';
            notation.style.display = 'none';
        }
    }, false);

    document.querySelector('#reset_camera').addEventListener('click', () => {
        camera.position.set(0, 0, width * 2);
        camera.rotation.set(0, 0, 0);
        controls.reset();
    }, false);

    document.querySelector('#reset_pose').addEventListener('click', () => {
        for (let i = 0; i < standard_pose.length; ++i) {
            const [x, y, z] = standard_pose[i];
            joints[i].position.set(x * width, y * width, z * width);
        }
    }, false);

    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        for (let i = 0; i < limb_pairs.length; ++i) {
            const [from_index, to_index] = limb_pairs[i];
            const [from, to] = [joints[from_index], joints[to_index]];
            limbs[i].geometry.setPoints([from.position, to.position], p => JOINT_RADIUS);
        }
        renderer.render(scene, camera);
    };

    return animate;
}

function init() {
    const save = document.querySelector('#save_button');
    save.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = document.querySelector('#main_canvas').toDataURL('image/png');
        a.download = 'download.png';
        a.click();
    }, false);

    const copy = document.querySelector('#copy_button');
    copy.addEventListener('click', () => {
        if (globalThis.ClipboardItem === undefined) {
            alert('`ClipboardItem` is not defined. If you are in Firefox, change about:config -> dom.events.asyncClipboard.clipboardItem to `true`.')
            return;
        }

        const canvas = document.querySelector('#main_canvas');
        try {
            canvas.toBlob(blob => {
                try {
                    const data = new ClipboardItem({ [blob.type]: blob });
                    navigator.clipboard.write([data]);
                    notify('success!');
                } catch (e) {
                    notify(`failed to copy data: ${e.message}`, 'error');
                }
            });
        } catch (e) {
            notify(`failed to copy data: ${e.message}`, 'error');
        }
    }, false);
}

function notify(str, type) {
    if (type === undefined) type = 'success';

    switch (type) {
        case 'success': console.log(str); break;
        case 'info': console.info(str); break;
        case 'error': console.error(str); break;
    }

    const p = document.createElement('p');
    p.textContent = str;
    p.classList.add('item', type);
    const cont = document.querySelector('#notifications');
    cont.appendChild(p);
    setTimeout(() => cont.removeChild(p), 3000);
}

document.addEventListener('DOMContentLoaded', () => {

    init();

    const animate = init_3d();

    animate();

}, false);