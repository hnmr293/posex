const POSES = new Map();

function notify(str, type) {
    if (type === undefined) type = 'success';

    switch (type) {
        case 'success': console.log(str); break;
        case 'info': console.log(str); break;
        case 'warn': console.warn(str); break;
        case 'error': console.error(str); break;
    }

    const p = document.createElement('p');
    p.textContent = str;
    p.classList.add('item', type);
    const cont = document.querySelector('#notifications');
    cont.appendChild(p);
    setTimeout(() => cont.removeChild(p), 3000);
}

async function save_pose(obj) {
    const res = await fetch('/pose/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
    });
    const result = await res.json();
    if (result.ok) reload_poses();
    return result;
}

async function delete_pose(name) {
    const res = await fetch('/pose/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    const result = await res.json();
    notify(result.result, result.ok ? 'success' : 'error');
    if (result.ok) reload_poses();
    return result;
}

async function reload_poses() {
    POSES.clear();

    const res = await fetch('/pose/all');
    const cont = document.querySelector('#saved_poses');
    cont.innerHTML = '';
    const df = document.createDocumentFragment();
    for (let data of await res.json()) {
        POSES.set(data.name, data);

        const fig = document.createElement('figure')
        const img = document.createElement('img');
        const cap = document.createElement('figcaption');
        const clo = document.createElement('div');
        const clo2 = document.createElement('span');
        fig.dataset.poseName = data.name;
        cap.textContent = data.name;
        clo.textContent = 'x';
        clo.classList.add('close');
        clo2.classList.add('close2');
        clo2.textContent = 'delete';
        clo.appendChild(clo2);

        img.src = 'data:image/png;base64,' + data.image;
        img.title = data.name;
        fig.append(clo, img, cap);

        df.appendChild(fig);
    }
    cont.appendChild(df);
}

document.addEventListener('DOMContentLoaded', async () => {

    const ui = {
        container: document.querySelector('#cont'),
        canvas: document.querySelector('#main_canvas'),
        notation: document.querySelector('#notation'),
        indicator1: document.querySelector('#body_indicator1'),
        indicator2: document.querySelector('#body_indicator2'),
        all_reset: document.querySelector('#all_reset'),
        reset_camera: document.querySelector('#reset_camera'),
        reset_pose: document.querySelector('#reset_pose'),
        fixed_roll: document.querySelector('#fixed_roll'),
        add_body: document.querySelector('#add_body'),
        remove_body: document.querySelector('#remove_body'),
        canvas_width: document.querySelector('#canvas_width'),
        canvas_height: document.querySelector('#canvas_height'),
        bg: document.querySelector('#bg_file'),
        reset_bg: document.querySelector('#reset_bg'),
        elliptic_limbs: document.querySelector('#elliptic_limbs'),
        //joint_radius: document.querySelector('#joint_radius'),
        limb_width: document.querySelector('#limb_width'),
        low_fps: document.querySelector('#low_fps'),
        save: document.querySelector('#save_button'),
        copy: document.querySelector('#copy_button'),
        save_pose: document.querySelector('#save_pose'),
        save_pose_callback: save_pose,
        notify: notify,
    };

    document.addEventListener('poseload', e => {
        const obj = POSES.get(e.detail.name);
        if (obj) ui.loadPose(obj);
    }, false);

    const { init, init_3d } = await import('posex');

    init(ui);
    const animate = init_3d(ui);
    animate();

    await reload_poses();

}, false);

document.addEventListener('DOMContentLoaded', () => {
    const get_name = ele => {
        while (ele && ele !== document) {
            if (ele.dataset && ele.dataset.poseName !== undefined)
                return ele.dataset.poseName;
            ele = ele.parentNode;
        }
        return '';
    };

    document.querySelector('#saved_poses').addEventListener('click', e => {
        let target = e.target;
        if (target.tagName === 'IMG') target = target.parentNode;
        if (target.classList.contains('close2')) target = target.parentNode;
        if (target.tagName === 'FIGURE') {
            const name = get_name(target);
            const ev = new CustomEvent('poseload', { bubbles: true, detail: { name } });
            target.dispatchEvent(ev);
        } else if (target.classList.contains('close')) {
            const name = get_name(target);
            if (name.length != 0) {
                delete_pose(name);
            }
        }
    }, false);
}, false);
