console.log('[Posex] loading...');

async function _import() {
    if (!globalThis.posex || !globalThis.posex.import) {
        return await import('posex');
    } else {
        return await globalThis.posex.imports.posex();
    }
}
const { init, init_3d } = await _import();

(function () {
    function init_canvas(type, enabled, container, button) {
        const $ = x => document.createElement(x);
        
        container.classList.add('posex_cont');

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
        
        const setting_cont = $('div');
        setting_cont.classList.add('posex_setting_cont');
        setting_cont.append(
            body_marker,
            add_body,
            remove_body,
            canvas_marker,
            canvas_width,
            canvas_height,
            bg_marker,
            bg_cont,
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
        const save = $('button'); save.classList.add('posex_save', 'posex_misc', 'posex_box'); save.innerHTML = '&#x1f4be; Save';
        
        const misc_cont = $('div');
        misc_cont.classList.add('posex_misc_cont');
        misc_cont.append(
            copy,
            save
        );

        container.innerHTML = '';
        container.append(
            all_reset,
            reset_cont,
            canvas_cont,
            indicator2,
            indicator1,
            notation,
            misc_cont,
        )
        
        // generate button --(1)-> apply button --(2)-> base64 --(3)-> generate button
        
        let actual = false;
        // (1)
        button.addEventListener('click', e => {
            if (!enabled.checked) return;
            
            if (actual) {
                actual = false;
                return;
            }
            
            // hook `generate` button to add canvas data
            e.preventDefault();
            e.stopPropagation();
            gradioApp().querySelector(`#posex-${type}-apply`).click();
        }, true);
        
        // (2)
        // called from `#posex-{t2i,i2i}-apply` .click
        const apply = enabled => {
            if (!enabled) return '';
            const url = canvas.toDataURL('image/png');
            actual = true;
            
            const random = Math.random().toString(32).substring(2);
            // goes to sink
            
            return [url, random];
        };

        // (3)
        // called from `#posex-{t2i,i2i}-sink`
        const generate = enabled => {
            actual = true;
            button.click();
        };
        
        globalThis[`posex_${type}_apply`] = apply;
        globalThis[`posex_${type}_generate`] = generate;
        
        const ui = {
            container,
            canvas,
            notation,
            indicator1,
            indicator2,
            all_reset,
            reset_camera,
            reset_pose,
            add_body,
            remove_body,
            canvas_width,
            canvas_height,
            bg: bg_input,
            reset_bg,
            save,
            copy,
            notify: function (str) { console.log(str); }
        };
        
        init(ui);
        
        const animate = init_3d(ui);
        
        animate();
    }

    const app = gradioApp();
    init_canvas(
        't2i',
        app.querySelector('#posex-t2i-enabled input[type=checkbox]'),
        app.querySelector('#posex-t2i-html'),
        app.querySelector('#txt2img_generate')
    );
    init_canvas(
        'i2i',
        app.querySelector('#posex-i2i-enabled input[type=checkbox]'),
        app.querySelector('#posex-i2i-html'),
        app.querySelector('#img2img_generate')
    );
})();
