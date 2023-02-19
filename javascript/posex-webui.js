(function () {
    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;

    function load(cont) {
        const scripts = cont.textContent.trim().split('\n');
        const base_path = `/file=${scripts.shift()}/static/js`;
        cont.textContent = '';

        const df = document.createDocumentFragment();
        for (let src of scripts) {
            const script = document.createElement('script');
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
        if (posex.called) return;
        const app = gradioApp();
        if (!app || app === document) return;

        const t2i_cont = app.querySelector('#posex-t2i-js')
        const i2i_cont = app.querySelector('#posex-i2i-js')
        if (!t2i_cont || !i2i_cont) return;

        posex.called = true;

        load(t2i_cont);
        load(i2i_cont);
    });
})();
