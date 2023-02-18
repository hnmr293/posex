import * as THREE from 'three';
import { TrackballControls } from 'three-trackballcontrols';
import { DragControls } from 'three-dragcontrols';
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three-meshline';

const JOINT_RADIUS = 4.0;
const LIMB_SIZE = 4.0;

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
    [0.416, 0.750, 0.000],  // 2:  right shoulder
    [0.305, 0.750, 0.000],  // 3:  right elbow
    [0.188, 0.750, 0.000],  // 4:  right wrist
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

function create_body(unit, x0, y0, z0) {
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
        joint.position.x = x * unit + x0;
        joint.position.y = y * unit + y0;
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
        indicator1 = document.querySelector('#body_indicator1'),
        indicator2 = document.querySelector('#body_indicator2'),
        width = canvas.width,
        height = canvas.height,
        unit = width;

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

    const bodies = new Map();
    let selected_body = null;
    let touched_body = null;
    const touchable_objects = [];
    const touchable_bodies = [];
    const object_to_body = new Map();

    function remove(mesh) {
        if (mesh instanceof Array) {
            for (let m of mesh) remove(m);
        } else {
            mesh.material.dispose();
            mesh.geometry.dispose();
            object_to_body.delete(mesh);
        }
    };
    const add_body = (name, x0, y0, z0) => {
        remove_body(name);
        const [joints, limbs] = create_body(unit, x0, y0, z0);
        const group = new THREE.Group(); // for DragControls

        const dispose = () => {
            for (let joint of joints) {
                array_remove(touchable_objects, joint);
                remove(joint);
            }
            for (let limb of limbs) {
                remove(limb);
                scene.remove(limb);
            }
            array_remove(touchable_bodies, group);
            scene.remove(group);
        };

        const reset = (dx, dy, dz) => {
            if (dx === undefined) dx = x0;
            if (dy === undefined) dy = y0;
            if (dz === undefined) dz = z0;
            for (let i = 0; i < standard_pose.length; ++i) {
                const [x, y, z] = standard_pose[i];
                joints[i].position.set(x * unit + dx, y * unit + dy, z + dz);
            }
            group.position.set(0, 0, 0);
        };

        const body = { name, group, joints, limbs, x0, y0, z0, dispose, reset };
        for (let joint of joints) {
            touchable_objects.push(joint);
            object_to_body.set(joint, body);
            group.add(joint);
        }
        for (let limb of limbs) {
            scene.add(limb);
            object_to_body.set(limb, body);
        }
        object_to_body.set(group, body);

        bodies.set(name, body);
        scene.add(group);
        touchable_bodies.push(group);
    };

    const remove_body = name => {
        if (!bodies.get(name)) return;
        bodies.get(name).dispose();
        bodies.delete(name);
    };

    const get_body_rect = body => {
        const v = new THREE.Vector3();
        let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
        for (let joint of body.joints) {
            const wpos = joint.getWorldPosition(v);
            const spos = wpos.project(camera);
            if (spos.x < xmin) xmin = spos.x;
            if (xmax < spos.x) xmax = spos.x;
            if (spos.y < ymin) ymin = spos.y;
            if (ymax < spos.y) ymax = spos.y;
        }
        return [xmin, ymin, xmax, ymax];
    };

    const default_body = add_body('defualt', 0, 0, 0);

    const controls = new TrackballControls(camera, renderer.domElement);
    const dragger_joint = new DragControls(touchable_objects, camera, renderer.domElement);
    const dragger_body = new DragControls([], camera, renderer.domElement);
    dragger_body.transformGroup = true;

    dragger_joint.addEventListener('dragstart', () => { controls.enabled = false; });
    dragger_joint.addEventListener('dragend', () => { controls.enabled = true; });
    dragger_body.addEventListener('dragstart', () => { controls.enabled = false; });
    dragger_body.addEventListener('dragend', () => { controls.enabled = true; });

    renderer.domElement.addEventListener('pointerdown', e => {
        dragger_joint.enabled = e.button === 0;
        dragger_body.enabled = e.button === 2;
    }, true);

    const rc = new THREE.Raycaster();
    const m = new THREE.Vector2();
    renderer.domElement.addEventListener('pointermove', e => {
        e.preventDefault();
        m.x = ((e.clientX - renderer.domElement.offsetLeft) / width) * 2 - 1;
        m.y = (-(e.clientY - renderer.domElement.offsetTop) / height) * 2 + 1;
        rc.setFromCamera(m, camera);
        const touched = rc.intersectObjects(touchable_objects);

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

        // show temporary selection
        if (touched.length != 0) {
            touched_body = object_to_body.get(touched[0].object);
        } else {
            touched_body = null;
        }
    }, false);

    renderer.domElement.addEventListener('pointerdown', e => {
        e.preventDefault();
        m.x = ((e.clientX - renderer.domElement.offsetLeft) / width) * 2 - 1;
        m.y = (-(e.clientY - renderer.domElement.offsetTop) / height) * 2 + 1;
        rc.setFromCamera(m, camera);
        const touched = rc.intersectObjects(touchable_objects);

        // show selection
        if (touched.length != 0) {
            selected_body = object_to_body.get(touched[0].object);
            const objs = dragger_body.getObjects();
            objs.length = 0;
            objs.push(selected_body.group);
            dragger_body.onPointerDown(e);
        } else {
            selected_body = null;
            dragger_body.getObjects().length = 0;
        }
    }, false);

    document.querySelector('#all_reset').addEventListener('click', () => {
        touched_body = null;
        selected_body = null;
        camera.position.set(0, 0, width * 2);
        camera.rotation.set(0, 0, 0);
        controls.reset();
        for (let name of Array.from(bodies.keys()).slice(1)) {
            remove_body(name);
        }
        for (let body of bodies.values()) {
            body.reset(0, 0, 0);
        }
    }, false);

    document.querySelector('#reset_camera').addEventListener('click', () => {
        camera.position.set(0, 0, width * 2);
        camera.rotation.set(0, 0, 0);
        controls.reset();
    }, false);

    document.querySelector('#reset_pose').addEventListener('click', () => {
        if (selected_body) {
            selected_body.reset();
        } else {
            for (let [name, body] of bodies) {
                body.reset();
            }
        }
    }, false);

    let body_num = 1;
    document.querySelector('#add_body').addEventListener('click', () => {
        const last_body = selected_body ?? Array.from(bodies.values()).at(-1);
        const base = last_body.joints[0].getWorldPosition(new THREE.Vector3());
        const
            dx = base.x - standard_pose[0][0] * unit,
            dy = base.y - standard_pose[0][1] * unit,
            dz = base.z - standard_pose[0][2];
        add_body(`body_${body_num++}`, dx + 32, dy, dz);
    }, false);

    document.querySelector('#remove_body').addEventListener('click', () => {
        if (!selected_body) {
            notify('No body is selected.', 'error');
            return;
        }
        if (bodies.size <= 1) {
            notify('No body is not allowed.', 'error');
            return;
        }
        remove_body(selected_body.name);
        touched_body = null;
        selected_body = null;
    }, false);

    const get_client_boundary = body => {
        let [xmin, ymin, xmax, ymax] = get_body_rect(body);

        // [-1,1] -> [0,width]
        xmin = (xmin + 1) * unit / 2;
        xmax = (xmax + 1) * unit / 2;
        ymin = unit - (ymin + 1) * unit / 2;
        ymax = unit - (ymax + 1) * unit / 2;
        [ymin, ymax] = [ymax, ymin];

        // add margin
        xmin = xmin - 5 + renderer.domElement.offsetLeft;
        xmax = xmax + 5 + renderer.domElement.offsetLeft;
        ymin = ymin - 5 + renderer.domElement.offsetTop;
        ymax = ymax + 5 + renderer.domElement.offsetTop;

        return [xmin, ymin, xmax, ymax];
    }

    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();

        for (let [name, body] of bodies) {
            const { joints, limbs, group } = body;
            // update joint size
            for (let joint of joints) {
                joint.scale.setScalar(1 / camera.zoom);
            }
            // show limbs
            const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
            for (let i = 0; i < limb_pairs.length; ++i) {
                const [from_index, to_index] = limb_pairs[i];
                const [from, to] = [joints[from_index], joints[to_index]];
                limbs[i].geometry.setPoints([from.getWorldPosition(v1), to.getWorldPosition(v2)], p => LIMB_SIZE / camera.zoom);
            }
        }

        // show selection
        if (touched_body) {
            let [xmin, ymin, xmax, ymax] = get_client_boundary(touched_body);
            const st = indicator2.style;
            st.display = 'block';
            st.left = `${xmin}px`;
            st.top = `${ymin}px`;
            st.width = `${xmax - xmin}px`;
            st.height = `${ymax - ymin}px`;
        } else {
            indicator2.style.display = 'none';
        }

        if (selected_body) {
            let [xmin, ymin, xmax, ymax] = get_client_boundary(selected_body);
            const st = indicator1.style;
            st.display = 'block';
            st.left = `${xmin}px`;
            st.top = `${ymin}px`;
            st.width = `${xmax - xmin}px`;
            st.height = `${ymax - ymin}px`;
        } else {
            indicator1.style.display = 'none';
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

function array_remove(array, item) {
    let index = array.indexOf(item);
    while (0 <= index) {
        array.splice(index, 1);
        index = array.indexOf(item);
    }
}