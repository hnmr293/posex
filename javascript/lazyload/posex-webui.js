async function _import() {
    if (!globalThis.posex || !globalThis.posex.import) {
        const { init_3d } = await import('posex');
        return { init_3d };
    } else {
        return await globalThis.posex.imports.posex();
    }
}
const { init_3d } = await _import();

(function () {
    if (!globalThis.posex) globalThis.posex = {};
    const posex = globalThis.posex;

    function init(cont, b64, button) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        
        const notation = document.createElement('p');
        notation.classList.add('posex_notation');

        const ind1 = document.createElement('div');
        ind1.classList.add('posex_indicator1');
        
        const ind2 = document.createElement('div');
        ind2.classList.add('posex_indicator2');
        
        cont.innerHTML = '';
        cont.appendChild(canvas);
        cont.appendChild(notation);
        cont.appendChild(ind2);
        cont.appendChild(ind1);
        
        button.addEventListener('click', () => {
            canvas.toBlob(blob => {})
        }, false);
        
        const animate = init_3d({
            canvas: canvas,
            notation: notation,
            indicator1: ind1,
            indicator2: ind2,
            notify: function (str) { console.log(str); }
        });
        
        animate();
    }

    const app = gradioApp();
    init(app.querySelector('#posex-t2i-html'), app.querySelector('#posex-t2i-base64'), app.querySelector('#txt2img_generate'));
    init(app.querySelector('#posex-i2i-html'), app.querySelector('#posex-i2i-base64'), app.querySelector('#img2img_generate'));
})();
