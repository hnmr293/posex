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

    function init(type, enabled, cont, button) {
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
        
        const animate = init_3d({
            container: cont,
            canvas: canvas,
            notation: notation,
            indicator1: ind1,
            indicator2: ind2,
            notify: function (str) { console.log(str); }
        });
        
        animate();
    }

    const app = gradioApp();
    init(
        't2i',
        app.querySelector('#posex-t2i-enabled input[type=checkbox]'),
        app.querySelector('#posex-t2i-html'),
        app.querySelector('#txt2img_generate')
    );
    init(
        'i2i',
        app.querySelector('#posex-i2i-enabled input[type=checkbox]'),
        app.querySelector('#posex-i2i-html'),
        app.querySelector('#img2img_generate')
    );
})();
