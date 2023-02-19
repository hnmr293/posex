import os
import io
import base64
from PIL import Image
import gradio as gr
from modules import scripts
from modules.processing import StableDiffusionProcessing
from modules.shared import opts
from modules import extensions

class Script(scripts.Script):

    def title(self):
        return 'Posex'
    
    def show(self, is_img2img):
        return scripts.AlwaysVisible
    
    def ui(self, is_img2img):
        id = lambda s: f'posex-{["t2i", "i2i"][is_img2img]}-{s}'
        ext = self.get_self_extension()
        if ext is None:
            return []
        js_ = [f'{x.path}?{os.path.getmtime(x.path)}' for x in ext.list_files('javascript/lazyload', '.js')]
        js_.insert(0, ext.path)
        
        with gr.Accordion('Posex', open=False):
            enabled = gr.Checkbox(value=False, label='Send this image to ControlNet.', elem_id=id('enabled'))
            js = gr.HTML(value='\n'.join(js_), elem_id=id('js'), visible=False)
            wrapper = gr.HTML(value='', elem_id=id('html'))
            apply = gr.Button(value='apply', visible=False, elem_id=id('apply'))
            base64 = gr.Textbox(visible=False, elem_id=id('base64'))
            sink = gr.HTML(value='', visible=False)
            sink2 = gr.HTML(value='', visible=False) # to suppress error in javascript
            
            apply.click(fn=None, _js=f'posex_{["t2i", "i2i"][is_img2img]}_apply', inputs=[enabled], outputs=[base64, sink])
            sink.change(fn=None, _js=f'posex_{["t2i", "i2i"][is_img2img]}_generate', inputs=[enabled], outputs=[sink2])
            
        return [enabled, base64]

    def process(self, p: StableDiffusionProcessing, enabled: bool = False, b64: str = ''):
        if not enabled or b64 is None or len(b64) == 0:
            return
        
        binary = io.BytesIO(base64.b64decode(b64[len('data:image/png;base64,'):]))
        image = Image.open(binary)
        
        opts.control_net_allow_script_control = True
        setattr(p, 'control_net_enabled', True)
        setattr(p, 'control_net_input_image', image)
    
    def get_self_extension(self):
        for ext in extensions.active():
            if ext.path in __file__:
                return ext
