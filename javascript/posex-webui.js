(function () {
    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;

    function load(cont) {
        function load_() {
            if (posex.script_loading || posex.script_loaded) return;
            posex.script_loading = true;
            
            const scripts = cont.textContent.trim().split('\n');
            const base_path = `/file=${scripts.shift()}/js`;
            cont.textContent = '';

            const df = document.createDocumentFragment();
            for (let src of scripts) {
                console.log(`[Posex] loading ${src}`);
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
            if (!globalThis.posex.imports.three) globalThis.posex.imports.three = async () => await import(`${base_path}/three.module.js`);
            if (!globalThis.posex.imports.posex) globalThis.posex.imports.posex = async () => await import(`${base_path}/posex.js`);
            cont.appendChild(df);
        }

        return posex.script_loaded ? Promise.resolve() : new Promise(resolve => {
            document.addEventListener('posexscriptloaded', () => resolve(), false);
            load_();
        });
    }

    function lazy(fn, timeout) {
        if (timeout === undefined) timeout = 500;
        return new Promise(function callback(resolve) {
            const result = fn();
            if (result) {
                resolve(result);
            } else {
                setTimeout(() => callback(resolve), timeout);
            }
        });
    }

    function hook_acc(acc, fn) {
        const observer = new MutationObserver(list => {
            for (let mut of list) {
                if (mut.type === 'childList') {
                    if (mut.addedNodes.length != 0) {
                        // closed -> opened
                        fn();
                    } else {
                        // opened -> closed
                        // do nothing
                    }
                }
            }
        });
        observer.observe(acc, { childList: true, attributes: false, subtree: false });
    }

    function launch(type) {
        return lazy(() => gradioApp()?.querySelector(`#posex-${type}-accordion`)).
            then(acc => hook_acc(acc, async () => {
                const cont = Array.from(acc.querySelectorAll(`#posex-${type}-js`)).at(-1); // !
                const enabled = acc.querySelector(`#posex-${type}-enabled input[type=checkbox]`);
                await load(cont);
                if (enabled.checked) {
                    await posex[`init_${type}`]();
                    console.log(`[Posex] ${type} initialized`);
                } else {
                    enabled.addEventListener('change', async () => {
                        await posex[`init_${type}`]();
                        console.log(`[Posex] ${type} initialized`);
                    }, { once: true });
                }
            }));
    }
    
    launch('t2i');
    launch('i2i');

})();
