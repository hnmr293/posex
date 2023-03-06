async function _import() {
    if (!globalThis.posex || !globalThis.posex.import) {
        const THREE = await import('three');
        const { TrackballControls } = await import('three-trackballcontrols');
        const { DragControls } = await import('three-dragcontrols');
        const { MeshLine, MeshLineMaterial } = await import('three-meshline');
        return { THREE, TrackballControls, DragControls, MeshLine, MeshLineMaterial };
    } else {
        return await globalThis.posex.import();
    }
}
const { THREE, TrackballControls, DragControls, MeshLine, MeshLineMaterial } = await _import();

const JOINT_RADIUS = 4.0;
const LIMB_SIZE = 4.0;
const LIMB_N = 64;

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
        joint.dirty = true; // update limbs in next frame
        joints.push(joint);
    }

    for (let i = 0; i < limb_pairs.length; ++i) {
        const [r, g, b] = joint_colors[i];
        const color = (r << 16) | (g << 8) | (b << 0);
        const line = new MeshLine();
        const mat = new MeshLineMaterial({ color: color, opacity: 0.6, transparent: true });
        limbs.push(new THREE.Mesh(line, mat));
    }

    return [joints, limbs];
}

function init_3d(ui) {
    const
        container = ui.container,
        canvas = ui.canvas,
        notation = ui.notation,
        indicator1 = ui.indicator1,
        indicator2 = ui.indicator2,
        width = () => canvas.width,
        height = () => canvas.height,
        unit = () => Math.min(width(), height()),
        unit_max = () => Math.max(width(), height());

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
    }, false);

    const scene = new THREE.Scene();
    const default_bg = () => new THREE.Color(0x000000);
    scene.background = default_bg();
    const camera = new THREE.OrthographicCamera(width() / -2, width() / 2, height() / 2, height() / -2, 1, width() * 4);
    camera.fixed_roll = ui.fixed_roll ? !!ui.fixed_roll.checked : false;
    camera.position.z = unit_max() * 2;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
    });
    renderer.setSize(width(), height());

    function set_bg(image_path, dont_dispose) {
        const old_tex = scene.background;
        if (image_path === null) {
            scene.background = default_bg();
            if (old_tex && old_tex.dispose && !dont_dispose) old_tex.dispose();
            return;
        }
        const tex = (image_path.isTexture || image_path.isColor) ? image_path : new THREE.TextureLoader().load(image_path);
        scene.background = tex;
        if (old_tex && old_tex.dispose && !dont_dispose) old_tex.dispose();
    }

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
        const [joints, limbs] = create_body(unit(), x0, y0, z0);
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
                joints[i].position.set(x * unit() + dx, y * unit() + dy, z + dz);
                joints[i].dirty = true;
            }
            group.position.set(0, 0, 0);
            body.dirty = true;
        };

        const body = {
            name,
            group,
            joints,
            limbs,
            x0, y0, z0,
            dispose,
            reset,
            dirty: true, // update limbs in next frame
        };

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

        return body;
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
    dragger_joint.addEventListener('drag', e => {
        e.object.dirty = true;
        object_to_body.get(e.object).dirty = true;
    });

    dragger_body.addEventListener('dragstart', () => { controls.enabled = false; });
    dragger_body.addEventListener('dragend', () => { controls.enabled = true; });
    dragger_body.addEventListener('drag', e => {
        const body = object_to_body.get(e.object);
        body.dirty = true;
        for (let i = 0; i < body.joints.length; ++i) {
            body.joints[i].dirty = true;
        }
    });

    renderer.domElement.addEventListener('pointerdown', e => {
        dragger_joint.enabled = e.button === 0;
        dragger_body.enabled = e.button === 2;
    }, true);

    const rc = new THREE.Raycaster();
    const m = new THREE.Vector2();
    renderer.domElement.addEventListener('pointermove', e => {
        e.preventDefault();
        m.x = (e.offsetX / width()) * 2 - 1;
        m.y = (1 - e.offsetY / height()) * 2 - 1;
        rc.setFromCamera(m, camera);
        const touched = rc.intersectObjects(touchable_objects);

        // show label
        if (touched.length != 0) {
            const [dx, dy] = get_relative_offset(renderer.domElement, container);
            notation.textContent = touched[0].object.name;
            notation.style.left = `${e.offsetX + dx}px`;
            notation.style.top = `${e.offsetY + dy - 32}px`;
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
        m.x = (e.offsetX / width()) * 2 - 1;
        m.y = (1 - e.offsetY / height()) * 2 - 1;
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

    if (ui.all_reset)
        ui.all_reset.addEventListener('click', () => {
            touched_body = null;
            selected_body = null;
            camera.position.set(0, 0, unit_max() * 2);
            camera.rotation.set(0, 0, 0);
            controls.reset();
            for (let name of Array.from(bodies.keys()).slice(1)) {
                remove_body(name);
            }
            for (let body of bodies.values()) {
                body.reset(0, 0, 0);
            }
        }, false);

    if (ui.reset_camera)
        ui.reset_camera.addEventListener('click', () => {
            camera.position.set(0, 0, unit_max() * 2);
            camera.rotation.set(0, 0, 0);
            controls.reset();
        }, false);

    if (ui.reset_pose)
        ui.reset_pose.addEventListener('click', () => {
            if (selected_body) {
                selected_body.reset();
            } else {
                for (let [name, body] of bodies) {
                    body.reset();
                }
            }
        }, false);

    if (ui.fixed_roll)
        ui.fixed_roll.addEventListener('change', () => {
            camera.fixed_roll = !!ui.fixed_roll.checked;
        }, false);

    let body_num = 1;
    if (ui.add_body)
        ui.add_body.addEventListener('click', () => {
            const last_body = selected_body ?? Array.from(bodies.values()).at(-1);
            const base = last_body.joints[0].getWorldPosition(new THREE.Vector3());
            const
                dx = base.x - standard_pose[0][0] * unit(),
                dy = base.y - standard_pose[0][1] * unit(),
                dz = base.z - standard_pose[0][2];
            add_body(`body_${body_num++}`, dx + 32, dy, dz);
        }, false);

    if (ui.remove_body)
        ui.remove_body.addEventListener('click', () => {
            if (!selected_body) {
                ui.notify('No body is selected.', 'error');
                return;
            }
            if (bodies.size <= 1) {
                ui.notify('No body is not allowed.', 'error');
                return;
            }
            remove_body(selected_body.name);
            touched_body = null;
            selected_body = null;
        }, false);

    const get_client_boundary = body => {
        let [xmin, ymin, xmax, ymax] = get_body_rect(body);

        // [-1,1] -> [0,width]
        xmin = (xmin + 1) * width() / 2;
        xmax = (xmax + 1) * width() / 2;
        ymin = height() - (ymin + 1) * height() / 2;
        ymax = height() - (ymax + 1) * height() / 2;
        [ymin, ymax] = [ymax, ymin];

        // add margin
        xmin = xmin - 5 + renderer.domElement.offsetLeft;
        xmax = xmax + 5 + renderer.domElement.offsetLeft;
        ymin = ymin - 5 + renderer.domElement.offsetTop;
        ymax = ymax + 5 + renderer.domElement.offsetTop;

        return [xmin, ymin, xmax, ymax];
    }

    const size_change = (w, h) => {
        if (w < 64 || h < 64) return;
        canvas.width = w;
        canvas.height = h;
        renderer.setSize(w, h);
        // update camera
        camera.left = w / -2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = h / -2;
        camera.near = 1;
        camera.far = w * 4;
        camera.position.z = unit_max() * 2;
        camera.updateProjectionMatrix();
        controls.handleResize();
    };

    const width_input = ui.canvas_width, height_input = ui.canvas_height;
    if (width_input && height_input) {
        width_input.addEventListener('change', () => {
            const w = +width_input.value;
            const h = +height_input.value;
            size_change(w, h);
        }, false);
        height_input.addEventListener('change', () => {
            const w = +width_input.value;
            const h = +height_input.value;
            size_change(w, h);
        }, false);
    }

    if (ui.bg)
        ui.bg.addEventListener('change', e => {
            const files = ui.bg.files;
            if (files.length != 0) {
                const file = files[0];
                const r = new FileReader();
                r.onload = () => set_bg(r.result);
                r.readAsDataURL(file);
            }
            ui.bg.value = '';
        }, false);

    if (ui.reset_bg)
        ui.reset_bg.addEventListener('click', () => set_bg(null), false);

    function get_pose_dict(obj3d) {
        return {
            position: obj3d.position.toArray(),
            rotation: obj3d.rotation.toArray(),
            scale: obj3d.scale.toArray(),
            up: obj3d.up.toArray(),
        };
    }

    function set_pose_dict(obj3d, dict) {
        obj3d.position.set(...dict.position);
        obj3d.rotation.set(...dict.rotation);
        obj3d.scale.set(...dict.scale);
        obj3d.up.set(...dict.up);
    }

    if (ui.save_pose && ui.save_pose_callback)
        ui.save_pose.addEventListener('click', async () => {
            const name = prompt('Input pose name.');
            if (name === undefined || name === null || name === '') return;

            const screen = {
                width: width(),
                height: height(),
            }

            const camera_ = get_pose_dict(camera);
            camera_.zoom = camera.zoom;

            const joints = [];
            for (let [name, body] of bodies) {
                joints.push({
                    name,
                    joints: body.joints.map(j => get_pose_dict(j)),
                    group: get_pose_dict(body.group),
                    x0: body.x0,
                    y0: body.y0,
                    z0: body.z0,
                });
            }

            const image = await ui.getDataURL();

            const data = { name, image, screen, camera: camera_, joints };
            const result = await ui.save_pose_callback(data);
            ui.notify(result.result, result.ok ? 'success' : 'error');
        }, false);

    const onAnimateEndOneshot = [];

    // joint and limb update
    let elliptic_limbs = ui.elliptic_limbs ? !!ui.elliptic_limbs.checked : true;
    //let joint_size_m = ui.joint_radius ? +ui.joint_radius.value / JOINT_RADIUS : 1.0;
    let limb_size_m = ui.limb_width ? +ui.limb_width.value / LIMB_SIZE : 1.0;
    if (ui.elliptic_limbs)
        ui.elliptic_limbs.addEventListener('change', () => {
            const b = !!ui.elliptic_limbs.checked;
            if (elliptic_limbs !== b) {
                elliptic_limbs = b;
                for (let body of bodies.values()) {
                    body.dirty = true;
                    for (let i = 0; i < body.joints.length; ++i) {
                        body.joints[i].dirty = true;
                    }
                }
            }
        }, false);

    //if (ui.joint_radius)
    //    ui.joint_radius.addEventListener('input', () => {
    //        const new_val = +ui.joint_radius.value / JOINT_RADIUS;
    //        if (joint_size_m !== new_val) {
    //            joint_size_m = new_val;
    //            for (let body of bodies.values()) {
    //                body.dirty = true;
    //                for (let i = 0; i < body.joints.length; ++i) {
    //                    body.joints[i].dirty = true;
    //                }
    //            }
    //        }
    //    }, false);

    if (ui.limb_width)
        ui.limb_width.addEventListener('input', () => {
            const new_val = +ui.limb_width.value / LIMB_SIZE;
            if (limb_size_m !== new_val) {
                limb_size_m = new_val;
                for (let body of bodies.values()) {
                    body.dirty = true;
                    for (let i = 0; i < body.joints.length; ++i) {
                        body.joints[i].dirty = true;
                    }
                }
            }
        }, false);

    const limb_vecs = Array.from(Array(LIMB_N)).map(x => new THREE.Vector3());
    function elliptic_limb_width(p) {
        // draw limb ellipse
        //   x^2 / a^2 + y^2 / b^2 = 1
        //     a := half of distance between two joints
        //     b := 2 * LIMB_SIZE / camera.zoom
        //   {a(2p-1)}^2 / a^2 + y^2 / b^2 = 1
        //   y^2 = b^2 { 1 - (2p-1)^2 }
        const b = 2 * LIMB_SIZE * limb_size_m / camera.zoom;
        const pp = 2 * p - 1;
        return b * Math.sqrt(1 - pp * pp);
    }
    function stick_limb_width(p) {
        // half width of ellipse
        return LIMB_SIZE * limb_size_m / camera.zoom;
    }
    function create_limb(mesh, from, to) {
        const s0 = limb_vecs[0];
        const s1 = limb_vecs[LIMB_N - 1];
        from.getWorldPosition(s0);
        to.getWorldPosition(s1);
        const N = LIMB_N - 1;
        for (let i = 1; i < limb_vecs.length - 1; ++i) {
            limb_vecs[i].lerpVectors(s0, s1, i / N);
        }
        mesh.geometry.setPoints(limb_vecs, elliptic_limbs ? elliptic_limb_width : stick_limb_width);
    }

    let low_fps = ui.low_fps ? !!ui.low_fps.checked : false;
    if (ui.low_fps)
        ui.low_fps.addEventListener('change', () => {
            low_fps = !!ui.low_fps.checked;
        }, false);

    let last_zoom = camera.zoom;
    let running = true;
    //const frames = [0,0,0,0,0,0,0,0,0,0], frame_index = 0;
    let last_tick = globalThis.performance.now();
    const animate = () => {
        const t0 = globalThis.performance.now();
        //frames[(frame_index++)%frames.length] = t0 - last_tick;
        //last_tick = t0;
        //console.log(frames.reduce((acc, cur) => acc + cur) / frames.length);

        requestAnimationFrame(animate);
        if (!running) return;

        if (controls.enabled) {
            if (controls.screen.width === 0 && controls.screen.height === 0) {
                controls.handleResize();
            }
        }
        controls.update();

        if (low_fps && t0 - last_tick < 30) return; // nearly 30fps
        last_tick = t0;
        
        for (let [name, body] of bodies) {
            const { joints, limbs, group } = body;

            // update joint size
            for (let joint of joints) {
                joint.scale.setScalar(1 / camera.zoom);
            }

            // show limbs
            const zoom_changed = last_zoom !== camera.zoom;
            if (body.dirty || zoom_changed) {
                for (let i = 0; i < limb_pairs.length; ++i) {
                    const [from_index, to_index] = limb_pairs[i];
                    const [from, to] = [joints[from_index], joints[to_index]];
                    if (from.dirty || to.dirty || zoom_changed) {
                        create_limb(limbs[i], from, to);
                    }
                }

                for (let i = 0; i < joints.length; ++i) {
                    joints[i].dirty = false;
                }
                body.dirty = false;
            }
        }

        last_zoom = camera.zoom;

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

        if (camera.fixed_roll) camera.up.set(0, 1, 0);
        renderer.render(scene, camera);

        for (let fn of onAnimateEndOneshot) {
            fn();
        }
        onAnimateEndOneshot.length = 0;
    };

    ui.loadPose = function (data) {
        selected_body = null;
        touched_body = null;
        touchable_objects.length = 0;
        touchable_bodies.length = 0;
        object_to_body.clear();
        for (let name of bodies.keys()) {
            remove_body(name);
        }

        // screen
        size_change(data.screen.width, data.screen.height);
        if (width_input) width_input.value = data.screen.width;
        if (height_input) height_input.value = data.screen.height;

        // camera
        set_pose_dict(camera, data.camera);
        camera.zoom = data.camera.zoom;
        camera.updateProjectionMatrix();

        // bodies

        // update `body_num`
        const body_names = data.joints.map(x => {
            const m = /^body_(\d+)$/.exec(x.name);
            return m ? +m[1] : -1;
        }).filter(x => 0 <= x);
        if (body_names.length == 0) {
            body_num = 0;
        } else {
            body_num = Math.max(...body_names) + 1;
        }

        for (let dict of data.joints) {
            const body = add_body(dict.name, dict.x0, dict.y0, dict.z0);
            for (let i = 0, e = Math.min(body.joints.length, dict.joints.length); i < e; ++i) {
                set_pose_dict(body.joints[i], dict.joints[i]);
            }
            set_pose_dict(body.group, dict.group);
        }
    };

    ui.getDataURL = async function () {
        const pr = new Promise(resolve => {
            const current_bg = scene.background;
            set_bg(null, true);
            onAnimateEndOneshot.push(() => {
                resolve(renderer.domElement.toDataURL('image/png'));
                set_bg(current_bg);
            });
        });
        return await pr;
    };

    ui.getBlob = async function () {
        const pr = new Promise(resolve => {
            const current_bg = scene.background;
            set_bg(null, true);
            onAnimateEndOneshot.push(() => {
                renderer.domElement.toBlob(blob => {
                    resolve(blob);
                    set_bg(current_bg);
                });
            });
        });
        return await pr;
    };

    ui.stop = function () {
        running = false;
        dragger_joint.deactivate();
        dragger_joint.enabled = false;
        dragger_body.deactivate();
        dragger_body.enabled = false;
        controls.enabled = false;
    };

    ui.play = function () {
        running = true;
        dragger_joint.activate();
        dragger_joint.enabled = true;
        dragger_body.activate();
        dragger_body.enabled = true;
        controls.enabled = true;
        controls.handleResize();
    };

    return animate;
}

function init(ui) {
    if (ui.save)
        ui.save.addEventListener('click', async () => {
            const a = document.createElement('a');
            if (ui.getDataURL) {
                a.href = await ui.getDataURL('image/png');
            } else {
                a.href = ui.canvas.toDataURL('image/png');
            }
            a.download = 'download.png';
            a.click();
            ui.notify('save success');
        }, false);

    if (ui.copy)
        ui.copy.addEventListener('click', async () => {
            if (globalThis.ClipboardItem === undefined) {
                alert('`ClipboardItem` is not defined. If you are in Firefox, change about:config -> dom.events.asyncClipboard.clipboardItem to `true`.')
                return;
            }

            async function get_blob() {
                if (ui.getBlob) {
                    return await ui.getBlob();
                } else {
                    return await new Promise(resolve => ui.canvas.toBlob(blob => resolve(blob)));
                }
            }
            try {
                const blob = await get_blob();
                const data = new ClipboardItem({ [blob.type]: blob });
                navigator.clipboard.write([data]);
                ui.notify('copy success');
            } catch (e) {
                ui.notify(`failed to copy data: ${e.message}`, 'error');
            }
        }, false);
}

function array_remove(array, item) {
    let index = array.indexOf(item);
    while (0 <= index) {
        array.splice(index, 1);
        index = array.indexOf(item);
    }
}

function get_relative_offset(target, origin) {
    const r0 = origin.getBoundingClientRect();
    const r1 = target.getBoundingClientRect();
    return [r1.left - r0.left, r1.top - r0.top];
}

export { init, init_3d };
