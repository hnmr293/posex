async function _import() {
    if (!globalThis.posex || !globalThis.posex.import) {
        return await import('posex');
    } else {
        return await globalThis.posex.imports.posex();
    }
}
const { init, init_3d } = await _import();

(async function () {
    let _r = 0;
    function to_gradio(v) {
        // force call `change` event on gradio
        return [v.toString(), (_r++).toString()];
    }

    function js2py(type, gradio_field, value) {
        // set `value` to gradio's field
        // (1) Click gradio's button.
        // (2) Gradio will fire js callback to retrieve value to be set.
        // (3) Gradio will fire another js callback to notify the process has been completed.
        return new Promise(resolve => {
            const callback_name = `posex-${type}-${gradio_field}`;

            // (2)
            globalThis[callback_name] = () => {

                delete globalThis[callback_name];

                // (3)
                const callback_after = callback_name + '_after';
                globalThis[callback_after] = () => {
                    delete globalThis[callback_after];
                    resolve();
                };

                return to_gradio(value);
            };

            // (1)
            gradioApp().querySelector(`#${callback_name}_set`).click();
        });
    }

    function py2js(type, pyname, ...args) {
        // call python's function
        // (1) Set args to gradio's field
        // (2) Click gradio's button
        // (3) JS callback will be kicked with return value from gradio

        // (1)
        return (args.length == 0 ? Promise.resolve() : js2py(type, pyname + '_args', JSON.stringify(args)))
            .then(() => {
                return new Promise(resolve => {
                    const callback_name = `posex-${type}-${pyname}`;
                    // (3)
                    globalThis[callback_name] = value => {
                        delete globalThis[callback_name];
                        resolve(value);
                    }
                    // (2)
                    gradioApp().querySelector(`#${callback_name}_get`).click();
                });
            });
    }

    function reload_poses(json, ui) {
        const df = document.createDocumentFragment();
        for (let data of json) {
            const fig = document.createElement('figure')
            const img = document.createElement('img');
            const cap = document.createElement('figcaption');
            const clo = document.createElement('div');
            const cloimg = document.createElement('img');
            const clo2 = document.createElement('span');
            fig.dataset.poseName = data.name;
            cap.textContent = data.name;
            clo.classList.add('close');
            cloimg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAAAG3RFWHRTb2Z0d2FyZQBDZWxzeXMgU3R1ZGlvIFRvb2zBp+F8AAAAxElEQVQ4y82T0REBQRBEX0dAJk4GJwKXgZMBESADIiADJwKXATI4GRBB+1lqKa62+DFV+7E7U6+6e2plm19K/wWQ1AE2QBcobZ9fehVwCb3rWwWShmHwaLsfvW+BAihs71otSJoBc2BuexFBl7anSRlI2gN5OBXQxIpSAB2gCXlcgCzOJGkLkg5ABhyB/B5cqoI1UAb5BbCxPU4CSBqFdda2B1GoE9urVoCkHlCH68N3ZOfzGkNw9dvBZ3Bu+/SHf+GbugG9/4ThhKqF8gAAAABJRU5ErkJggg==';
            clo2.classList.add('close2');
            clo2.textContent = 'delete';
            clo.append(cloimg, clo2);

            img.src = 'data:image/png;base64,' + data.image;
            img.title = data.name;
            fig.append(clo, img, cap);

            df.appendChild(fig);
        }

        ui.saved_poses.innerHTML = '';
        ui.saved_poses.appendChild(df);
    }

    function init_ui(type, api) {
        const $ = x => document.createElement(x);

        const all_reset = $('button');
        all_reset.innerHTML = '&#x1f504; All Reset';
        all_reset.classList.add('posex_all_reset', 'posex_box');

        const reset_camera = $('button');
        reset_camera.innerHTML = '&#x1f3a5; Reset Camera';
        reset_camera.classList.add('posex_reset_camera', 'posex_box');

        const reset_pose = $('button');
        reset_pose.innerHTML = '&#x1f9cd; Reset Pose';
        reset_pose.classList.add('posex_reset_pose', 'posex_box');

        const reset_cont = $('div');
        reset_cont.classList.add('posex_reset_cont');
        reset_cont.append(reset_camera, reset_pose);

        const canvas = $('canvas');
        canvas.width = 512;
        canvas.height = 512;

        const camera_marker = $('div'); camera_marker.textContent = '- Camera';
        const fixed_roll_label = $('label');
        const fixed_roll = $('input'); fixed_roll.type = 'checkbox'; fixed_roll.classList.add('posex_fixed_roll', 'posex_camera'); fixed_roll.checked = true;
        fixed_roll_label.append(fixed_roll, document.createTextNode('Fixed Roll'));
        const body_marker = $('div'); body_marker.textContent = '- Body';
        const add_body = $('button'); add_body.classList.add('posex_add_body', 'posex_body'); add_body.innerHTML = '&#x2795; Add';
        const remove_body = $('button'); remove_body.classList.add('posex_remove_body', 'posex_body'); remove_body.innerHTML = '&#x2796; Remove';
        const canvas_marker = $('div'); canvas_marker.textContent = '- Canvas Size';
        const canvas_width = $('input'); canvas_width.type = 'number'; canvas_width.value = 512; canvas_width.min = 64; canvas_width.classList.add('posex_canvas_width', 'posex_canvas_size');
        const canvas_height = $('input'); canvas_height.type = 'number'; canvas_height.value = 512; canvas_height.min = 64; canvas_height.classList.add('posex_canvas_height', 'posex_canvas_size');
        const bg_marker = $('div'); bg_marker.textContent = '- Background';
        const set_bg = $('label'); set_bg.classList.add('posex_bg');
        const bg_button = $('button'); bg_button.innerHTML = '&#x1f5bc; Set'; bg_button.onclick = () => bg_input.click();
        const bg_input = $('input'); bg_input.type = 'file'; bg_input.style.display = 'none';
        set_bg.append(bg_button, bg_input);
        const reset_bg = $('button'); reset_bg.classList.add('posex_bg'); reset_bg.innerHTML = '&#x274c; Del';
        const bg_cont = $('div'); bg_cont.classList.add('posex_bg_cont');
        bg_cont.append(set_bg, reset_bg);
        const joint_marker = $('div'); joint_marker.textContent = '- Joints and Limbs';
        const limb_width_label = $('label');
        const limb_width = $('input'); limb_width.type = 'range'; limb_width.min = 1; limb_width.max = 16; limb_width.value = 4; limb_width.classList.add('posex_joints', 'posex_limb_width');
        limb_width_label.append(limb_width, document.createTextNode('Limb Width'));
        const elliptic_limbs_label = $('label');
        const elliptic_limbs = $('input'); elliptic_limbs.type = 'checkbox'; elliptic_limbs.classList.add('posex_joints', 'posex_elliptic_limbs'); elliptic_limbs.checked = true;
        elliptic_limbs_label.append(elliptic_limbs, document.createTextNode('Elliptic Limbs'));
        const other_marker = $('div'); other_marker.textContent = '- Others';
        const low_fps_label = $('label');
        const low_fps = $('input'); low_fps.type = 'checkbox'; low_fps.classList.add('posex_low_fps', 'posex_others'); low_fps.checked = false;
        low_fps_label.append(low_fps, document.createTextNode('Low fps'));

        const setting_cont = $('div');
        setting_cont.classList.add('posex_setting_cont');
        setting_cont.append(
            camera_marker,
            fixed_roll_label,
            body_marker,
            add_body,
            remove_body,
            canvas_marker,
            canvas_width,
            canvas_height,
            bg_marker,
            bg_cont,
            joint_marker,
            limb_width_label,
            elliptic_limbs_label,
            other_marker,
            low_fps_label,
        );

        const canvas_cont = $('div');
        canvas_cont.classList.add('posex_canvas_cont');
        canvas_cont.append(
            canvas,
            setting_cont,
        );

        const notation = $('p');
        notation.classList.add('posex_notation');

        const indicator1 = $('div');
        indicator1.classList.add('posex_indicator1');

        const indicator2 = $('div');
        indicator2.classList.add('posex_indicator2');

        const copy = $('button'); copy.classList.add('posex_copy', 'posex_misc', 'posex_box'); copy.innerHTML = '&#x1f4cb; Copy to clipboard';
        const save = $('button'); save.classList.add('posex_save', 'posex_misc', 'posex_box'); save.innerHTML = '&#x1f4be; Download image';

        const misc_cont = $('div');
        misc_cont.classList.add('posex_misc_cont');
        misc_cont.append(
            copy,
            save
        );

        const save_pose = $('button');
        save_pose.classList.add('posex_save_pose', 'posex_box');
        save_pose.innerHTML = '&#x1f4be;&#x1f9cd; Save Pose';

        const save_pose_callback = async obj => {
            await py2js(type, 'savepose', obj);
            const json = await py2js(type, 'allposes')
            reload_poses(JSON.parse(json), ui);
            return { result: '', ok: true };
        };

        const saved_poses = $('div');
        saved_poses.classList.add('posex_saved_poses');

        saved_poses.addEventListener('click', async e => {
            const get_name = ele => {
                while (ele && ele !== document) {
                    if (ele.dataset && ele.dataset.poseName !== undefined)
                        return ele.dataset.poseName;
                    ele = ele.parentNode;
                }
                return '';
            };

            let target = e.target;
            if (target.tagName === 'IMG') target = target.parentNode;
            if (target.classList.contains('close2')) target = target.parentNode;
            if (target.tagName === 'FIGURE') {
                const name = get_name(target);
                if (name.length != 0) {
                    const json = await py2js(type, 'loadpose', name);
                    ui.loadPose(JSON.parse(json));
                }
            } else if (target.classList.contains('close')) {
                const name = get_name(target);
                if (name.length != 0) {
                    await py2js(type, 'delpose', name);
                    const json = await py2js(type, 'allposes')
                    reload_poses(JSON.parse(json), ui);
                }
            }
        }, false);

        const ui = {
            canvas,
            notation,
            indicator1,
            indicator2,
            all_reset,
            reset_camera,
            reset_pose,
            fixed_roll,
            add_body,
            remove_body,
            canvas_width,
            canvas_height,
            bg: bg_input,
            reset_bg,
            limb_width,
            elliptic_limbs,
            low_fps,
            save,
            copy,
            save_pose,
            save_pose_callback,
            saved_poses,
        };

        const df = document.createDocumentFragment();
        df.append(
            all_reset,
            reset_cont,
            canvas_cont,
            indicator2,
            indicator1,
            notation,
            misc_cont,
            save_pose,
            saved_poses,
        );

        return { ui, df };
    };

    async function init_canvas(
        type,
        enabled,
        generate_button,
        container,
        api
    ) {
        container.classList.add('posex_cont');
        container.innerHTML = '';
        const { ui, df } = init_ui(type, api);
        container.appendChild(df);

        ui.container = container;
        ui.notify = function (str, type) { if (type === 'error') console.error(str); };

        if (!posex[`${type}_click`]) {
            // Send canvas image to ControlNet when button is clicked.
            let force = false;
            gradioApp().addEventListener('click', async e => {
                if (e.target !== generate_button) return;

                if (!enabled.checked) return;

                if (force) {
                    force = false;
                    return;
                }

                // hook `generate` button to add canvas data
                e.preventDefault();
                e.stopPropagation();

                const data_url = await ui.getDataURL();
                await js2py(type, 'base64', data_url);
                force = true;
                generate_button.click();
            }, true);
            posex[`${type}_click`] = true;
        }

        {
            // Load saved poses.
            const json = await py2js(type, 'allposes')
            reload_poses(JSON.parse(json), ui);
        }

        init(ui);

        const animate = init_3d(ui);

        animate();

        onUiTabChange(() => {
            const tabname = get_uiCurrentTabContent().id;
            if (type === 't2i') {
                if (0 <= tabname.indexOf('txt2img')) {
                    ui.play();
                } else {
                    ui.stop();
                }
            } else if (type === 'i2i') {
                if (0 <= tabname.indexOf('img2img')) {
                    ui.play();
                } else {
                    ui.stop();
                }
            } else {
                ui.stop();
            }
        });
    }

    async function init_t2i() {
        const app = gradioApp();
        await init_canvas(
            't2i',
            app.querySelector('#posex-t2i-enabled input[type=checkbox]'),
            app.querySelector('#txt2img_generate'),
            Array.from(app.querySelectorAll('#posex-t2i-html')).at(-1), // !
            {
                load_all_poses: app.querySelector('#posex-t2i-api-all_pose'),
                delete_pose: app.querySelector('#posex-t2i-api-delete_pose'),
            }
        );
    }

    async function init_i2i() {
        const app = gradioApp();
        await init_canvas(
            'i2i',
            app.querySelector('#posex-i2i-enabled input[type=checkbox]'),
            app.querySelector('#img2img_generate'),
            Array.from(app.querySelectorAll('#posex-i2i-html')).at(-1), // !
            {
                load_all_poses: app.querySelector('#posex-i2i-api-all_pose'),
                delete_pose: app.querySelector('#posex-i2i-api-delete_pose'),
            }
        );
    }

    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;
    posex.init_t2i = init_t2i;
    posex.init_i2i = init_i2i;

    posex.script_loaded = true;
    document.dispatchEvent(new CustomEvent('posexscriptloaded'));

})();
