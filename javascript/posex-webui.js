(function () {
    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;
    let posix_executed = false;
    let isLoadScript = false;
    const loadJsScripts = async (base_path) => {
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

    }

    async function load(type) {
        const acc = gradioApp().querySelector(`#posex-${type}-accordion`);
        if (!acc) return;
        //load scripts contents
        const scriptsContainer = acc.querySelector(`#posex-${type}-js #posex-${type}-js`);
        if (!scriptsContainer) return;
        const scripts = scriptsContainer.textContent.trim().split('\n');
        scriptsContainer.textContent = '';
        const chgeckBoxInit = acc.querySelector(`#posex-${type}-enabled input[type=checkbox]`);
        posex.script_loading = true;
        const base_path = `/file=${scripts.shift()}/js`;
        const df = document.createDocumentFragment();
        for (let src of scripts) {
            console.log(`[Posex] loading ${src}`);
            const script = document.createElement('script');
            script.async = true;
            script.type = 'module';
            script.src = `file=${src}`;
            df.appendChild(script);
        }
        if (!isLoadScript) {
            loadJsScripts(base_path)
            isLoadScript = true;
        }
        scriptsContainer.appendChild(df);

        document.addEventListener('posexscriptloaded', () => {
            chgeckBoxInit.addEventListener('change', async () => {
                await posex[`init_${type}`]();
                console.log(`[Posex] ${type} initialized`);
            }, { once: true });
        }, false);
    }


    window.addEventListener('DOMContentLoaded', () => {
        const observer = new MutationObserver(async (m) => {
            if (!posix_executed && gradioApp().querySelector(`#posex-t2i-accordion`)) {
                posix_executed = true;
                load('t2i');
                load('i2i')
                observer.disconnect();
            }

        })
        observer.observe(gradioApp(), { childList: true, subtree: true })
    })
})();
