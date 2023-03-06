import os
import io
import base64
import json
from PIL import Image
import gradio as gr
from modules import scripts
from modules.processing import StableDiffusionProcessing
from modules.shared import opts
from modules import extensions

from common import posex_utils as posex

if '__file__' in globals():
    posex.set_save_dir(os.path.join(os.path.dirname(__file__), '..', 'saved_poses'))
else:
    # cf. https://stackoverflow.com/a/53293924
    import inspect
    posex.set_save_dir(os.path.join(os.path.dirname(inspect.getfile(lambda: None)), '..', 'saved_poses'))

class Script(scripts.Script):

    def title(self):
        return 'Posex'
    
    def show(self, is_img2img):
        return scripts.AlwaysVisible
    
    def ui(self, is_img2img):
        id = lambda s: f'posex-{["t2i", "i2i"][is_img2img]}-{s}'
        js = lambda s: f'globalThis["{id(s)}"]'
        
        ext = get_self_extension()
        if ext is None:
            return []
        js_ = [f'{x.path}?{os.path.getmtime(x.path)}' for x in ext.list_files('javascript/lazyload', '.js')]
        js_.insert(0, ext.path)
        
        with gr.Accordion('Posex', open=False):
            enabled = gr.Checkbox(value=False, label='Send this image to ControlNet.', elem_id=id('enabled'))
            
            gr.HTML(value='\n'.join(js_), elem_id=id('js'), visible=False)
            
            gr.HTML(value='', elem_id=id('html'))
            
            sink = gr.HTML(value='', visible=False) # to suppress error in javascript
            
            base64_set = gr.Button(visible=False, elem_id=id('base64_set'))
            base64 = gr.Textbox(visible=False, elem_id=id('base64'))
            base64_sink = gr.Textbox(visible=False)
            base64_set.click(fn=None, _js=js('base64'), outputs=[base64, base64_sink])
            base64_sink.change(fn=None, _js=js('base64_after'), outputs=[sink])
            
            allposes = gr.Button(visible=False, elem_id=id('allposes_get'))
            allposes_sink = gr.Textbox(visible=False)
            allposes_sink2 = gr.Textbox(visible=False)
            allposes.click(fn=wrap_api(all_pose), outputs=[allposes_sink, allposes_sink2])
            allposes_sink2.change(fn=None, _js=js('allposes'), inputs=[allposes_sink], outputs=[sink])
            
            delpose_args_set = gr.Button(visible=False, elem_id=id('delpose_args_set'))
            delpose_args = gr.Textbox(visible=False, elem_id=id('delpose_args'))
            delpose_args_sink = gr.Textbox(visible=False)
            delpose_args_set.click(fn=None, _js=js('delpose_args'), outputs=[delpose_args, delpose_args_sink])
            delpose_args_sink.change(fn=None, _js=js('delpose_args_after'), outputs=[sink])
            delpose = gr.Button(visible=False, elem_id=id('delpose_get'))
            delpose_sink = gr.Textbox(visible=False)
            delpose_sink2 = gr.Textbox(visible=False)
            delpose.click(fn=wrap_api(delete_pose), inputs=[delpose_args], outputs=[delpose_sink, delpose_sink2])
            delpose_sink2.change(fn=None, _js=js('delpose'), outputs=[sink])
            
            savepose_args_set = gr.Button(visible=False, elem_id=id('savepose_args_set'))
            savepose_args = gr.Textbox(visible=False, elem_id=id('savepose_args'))
            savepose_args_sink = gr.Textbox(visible=False)
            savepose_args_set.click(fn=None, _js=js('savepose_args'), outputs=[savepose_args, savepose_args_sink])
            savepose_args_sink.change(fn=None, _js=js('savepose_args_after'), outputs=[sink])
            savepose = gr.Button(visible=False, elem_id=id('savepose_get'))
            savepose_sink = gr.Textbox(visible=False)
            savepose_sink2 = gr.Textbox(visible=False)
            savepose.click(fn=wrap_api(save_pose), inputs=[savepose_args], outputs=[savepose_sink, savepose_sink2])
            savepose_sink2.change(fn=None, _js=js('savepose'), outputs=[sink])
            
            loadpose_args_set = gr.Button(visible=False, elem_id=id('loadpose_args_set'))
            loadpose_args = gr.Textbox(visible=False, elem_id=id('loadpose_args'))
            loadpose_args_sink = gr.Textbox(visible=False)
            loadpose_args_set.click(fn=None, _js=js('loadpose_args'), outputs=[loadpose_args, loadpose_args_sink])
            loadpose_args_sink.change(fn=None, _js=js('loadpose_args_after'), outputs=[sink])
            loadpose = gr.Button(visible=False, elem_id=id('loadpose_get'))
            loadpose_sink = gr.Textbox(visible=False)
            loadpose_sink2 = gr.Textbox(visible=False)
            loadpose.click(fn=wrap_api(load_pose), inputs=[loadpose_args], outputs=[loadpose_sink, loadpose_sink2])
            loadpose_sink2.change(fn=None, _js=js('loadpose'), inputs=[loadpose_sink], outputs=[sink])
            
        return [enabled, base64]

    def process(self, p: StableDiffusionProcessing, enabled: bool = False, b64: str = ''):
        if not enabled or b64 is None or len(b64) == 0:
            return
        
        binary = io.BytesIO(base64.b64decode(b64[len('data:image/png;base64,'):]))
        image = Image.open(binary)
        
        opts.control_net_allow_script_control = True
        setattr(p, 'control_net_enabled', True)
        setattr(p, 'control_net_input_image', image)
    
    def postprocess(self, p, processed, enabled: bool = False, b64: str = ''):
        if not enabled or b64 is None or len(b64) == 0:
            return
        
        opts.control_net_allow_script_control = False


def get_self_extension():
    if '__file__' in globals():
        filepath = __file__
    else:
        import inspect
        filepath = inspect.getfile(lambda: None)
    for ext in extensions.active():
        if ext.path in filepath:
            return ext

# APIs

def wrap_api(fn):
    _r = 0
    def f(*args, **kwargs):
        nonlocal _r
        _r += 1
        v = fn(*args, **kwargs)
        return v, str(_r)
    return f

def all_pose():
    return json.dumps(list(posex.all_poses()))

def delete_pose(args):
    posex.delete_pose(json.loads(args)[0])

def save_pose(args):
    posex.save_pose(json.loads(args)[0])

def load_pose(args):
    return json.dumps(posex.load_pose(json.loads(args)[0]))
