import os, glob, json, base64, re
from io import BytesIO
from PIL import Image, PngImagePlugin

_SAVED_POSES_DIR = ''

def set_save_dir(dir: str):
    global _SAVED_POSES_DIR
    _SAVED_POSES_DIR = os.path.realpath(str(dir))

def get_save_dir():
    assert len(_SAVED_POSES_DIR) != 0
    return _SAVED_POSES_DIR

def get_saved_path(name: str):
    #return os.path.realpath(os.path.join(get_save_dir(), name))
    return os.path.join(get_save_dir(), name)

def atoi(text):
    return int(text) if text.isdigit() else text

def natural_keys(text):
    return [ atoi(c) for c in re.split(r'(\d+)', text) ]

def sorted_glob(path):
    return sorted(glob.glob(path), key=natural_keys)

def name2path(name: str):
    if not isinstance(name, str):
        raise ValueError(f'str object expected, but {type(name)}')
    
    if len(name) == 0:
        raise ValueError(f'empty name')
    
    if '.' in name or '/' in name or '\\' in name:
        raise ValueError(f'invalid name: {name}')
    
    path = get_saved_path(f'{name}.png')
    if not path.startswith(get_save_dir()):
        raise ValueError(f'invalid name: {name}')
    
    return path

def saved_poses():
    for path in sorted_glob(os.path.join(get_save_dir(), '*.png')):
        yield Image.open(path)

def all_poses():
    for img in saved_poses():
        buffer = BytesIO()
        img.save(buffer, format='png')
        
        if not hasattr(img, 'text'):
            continue
        
        pose_dict = {
            'name': img.text['name'],                   # type: ignore
            'image': base64.b64encode(buffer.getvalue()).decode('ascii'),
            'screen': json.loads(img.text['screen']),   # type: ignore
            'camera': json.loads(img.text['camera']),   # type: ignore
            'joints': json.loads(img.text['joints']),   # type: ignore
        }
        
        yield pose_dict

def save_pose(data: dict):
    name = data['name']
    screen = data['screen']
    camera = data['camera']
    joints = data['joints']
    
    info = PngImagePlugin.PngInfo()
    info.add_text('name', name)
    info.add_text('screen', json.dumps(screen))
    info.add_text('camera', json.dumps(camera))
    info.add_text('joints', json.dumps(joints))
    
    filepath = name2path(name)
    
    image = Image.open(BytesIO(base64.b64decode(data['image'][len('data:image/png;base64,'):])))
    unit = max(image.width, image.height)
    mx, my = (unit - image.width) // 2, (unit - image.height) // 2
    canvas = Image.new('RGB', (unit, unit), color=(68, 68, 68))
    canvas.paste(image, (mx, my))
    image = canvas.resize((canvas.width//4, canvas.height//4))
    
    image.save(filepath, pnginfo=info)

def delete_pose(name: str):
    filepath = name2path(name)
    os.remove(filepath)

def load_pose(name: str):
    filepath = name2path(name)
    img = Image.open(filepath)
    
    buffer = BytesIO()
    img.save(buffer, format='png')
    
    if not hasattr(img, 'text'):
        raise ValueError(f'not pose data: {filepath}')
    
    pose_dict = {
        'name': img.text['name'],                   # type: ignore
        'image': base64.b64encode(buffer.getvalue()).decode('ascii'),
        'screen': json.loads(img.text['screen']),   # type: ignore
        'camera': json.loads(img.text['camera']),   # type: ignore
        'joints': json.loads(img.text['joints']),   # type: ignore
    }
    
    return pose_dict
