import os
import io
import base64
import json
from typing import Callable
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
            
            with gr.Group(visible=False):
                sink = gr.HTML(value='', visible=False) # to suppress error in javascript
                base64 = js2py('base64', id, js, sink)
                py2js('allposes', all_pose, id, js, sink)
                jscall('delpose', delete_pose, id, js, sink)
                jscall('savepose', save_pose, id, js, sink)
                jscall('loadpose', load_pose, id, js, sink)
            
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


def js2py(
    name: str,
    id: Callable[[str], str],
    js: Callable[[str], str],
    sink: gr.components.IOComponent,
) -> gr.Textbox:
    
    v_set = gr.Button(elem_id=id(f'{name}_set'))
    v = gr.Textbox(elem_id=id(name))
    v_sink = gr.Textbox()
    v_set.click(fn=None, _js=js(name), outputs=[v, v_sink])
    v_sink.change(fn=None, _js=js(f'{name}_after'), outputs=[sink])    
    return v

def py2js(
    name: str,
    fn: Callable[[], str],
    id: Callable[[str], str],
    js: Callable[[str], str],
    sink: gr.components.IOComponent,
) -> None:
    
    v_fire = gr.Button(elem_id=id(f'{name}_get'))
    v_sink = gr.Textbox()
    v_sink2 = gr.Textbox()
    v_fire.click(fn=wrap_api(fn), outputs=[v_sink, v_sink2])
    v_sink2.change(fn=None, _js=js(name), inputs=[v_sink], outputs=[sink])

def jscall(
    name: str,
    fn: Callable[[str], str],
    id: Callable[[str], str],
    js: Callable[[str], str],
    sink: gr.components.IOComponent,
) -> None:
    
    v_args_set = gr.Button(elem_id=id(f'{name}_args_set'))
    v_args = gr.Textbox(elem_id=id(f'{name}_args'))
    v_args_sink = gr.Textbox()
    v_args_set.click(fn=None, _js=js(f'{name}_args'), outputs=[v_args, v_args_sink])
    v_args_sink.change(fn=None, _js=js(f'{name}_args_after'), outputs=[sink])
    
    v_fire = gr.Button(elem_id=id(f'{name}_get'))
    v_sink = gr.Textbox()
    v_sink2 = gr.Textbox()
    v_fire.click(fn=wrap_api(fn), inputs=[v_args], outputs=[v_sink, v_sink2])
    v_sink2.change(fn=None, _js=js(name), inputs=[v_sink], outputs=[sink])


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
    return ''

def save_pose(args):
    posex.save_pose(json.loads(args)[0])
    return ''

def load_pose(args):
    return json.dumps(posex.load_pose(json.loads(args)[0]))
