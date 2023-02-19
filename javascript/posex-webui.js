(function () {
    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;

    function load(cont) {
        const scripts = cont.textContent.trim().split('\n');
        const base_path = `/file=${scripts.shift()}/js`;
        cont.textContent = '';

        const df = document.createDocumentFragment();
        for (let src of scripts) {
            const script = document.createElement('script');
            script.async = true;
            script.type = 'module';
            script.src = `file=${src}`;
            df.appendChild(script);
        }

        globalThis.posex.import = async () => {
            const THREE = await import(`${base_path}/three.module.js`);
            const { TrackballControls } = await import(`${base_path}/TrackballControls.js`);
            const { DragControls } = await import(`${base_path}/DragControls.js`);
            const { MeshLine, MeshLineMaterial } = await import(`${base_path}/THREE.MeshLine.Module.min.js`);
            return { THREE, TrackballControls, DragControls, MeshLine, MeshLineMaterial };
        };
        if (!globalThis.posex.imports) globalThis.posex.imports = {};
        globalThis.posex.imports.three = async () => await import(`${base_path}/three.module.js`);
        globalThis.posex.imports.posex = async () => await import(`${base_path}/posex.js`);
        cont.appendChild(df);
    }

    onUiUpdate(() => {
        const app = gradioApp();
        if (!app || app === document) return;

        const t2i_cont = app.querySelector('#posex-t2i-js')
        const i2i_cont = app.querySelector('#posex-i2i-js')
        if (!t2i_cont || !i2i_cont) return;

        const t2i_enabled = app.querySelector('#posex-t2i-enabled input[type=checkbox]');
        const i2i_enabled = app.querySelector('#posex-i2i-enabled input[type=checkbox]');
        
        const t2i_callback = () => {
            if (!posex.t2i_called) {
                posex.t2i_called = true;
                load(t2i_cont);
            }
        };
        
        const i2i_callback = () => {
            if (!posex.i2i_called) {
                posex.i2i_called = true;
                load(i2i_cont);
            }
        };
        
        if (t2i_enabled.checked) {
            t2i_callback();
        } else {
            t2i_enabled.addEventListener('change', t2i_callback, false);
        }
        
        if (i2i_enabled.checked) {
            i2i_callback();
        } else {
            i2i_enabled.addEventListener('change', i2i_callback, false);
        }
    });
})();
