document.addEventListener('DOMContentLoaded', async () => {
    const { init, init_3d } = await import('posex');
    const ui = {
        canvas: document.querySelector('#main_canvas'),
        notation: document.querySelector('#notation'),
        indicator1: document.querySelector('#body_indicator1'),
        indicator2: document.querySelector('#body_indicator2'),
        all_reset: document.querySelector('#all_reset'),
        reset_camera: document.querySelector('#reset_camera'),
        reset_pose: document.querySelector('#reset_pose'),
        add_body: document.querySelector('#add_body'),
        remove_body: document.querySelector('#remove_body'),
        canvas_width: document.querySelector('#canvas_width'),
        canvas_height: document.querySelector('#canvas_height'),
        save: document.querySelector('#save_button'),
        copy: document.querySelector('#copy_button'),
        notify: function () {
            function notify(str, type) {
                if (type === undefined) type = 'success';

                const p = document.createElement('p');
                p.textContent = str;
                p.classList.add('item', type);
                const cont = document.querySelector('#notifications');
                cont.appendChild(p);
                setTimeout(() => cont.removeChild(p), 3000);
            }
        },
    };

    init(ui);
    const animate = init_3d(ui);
    animate();
}, false);
