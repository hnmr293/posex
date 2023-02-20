if __name__ == '__main__':
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')

    import os, sys, importlib, glob, json, base64, traceback, re
    from functools import wraps
    from io import BytesIO
    from flask import Flask, jsonify, request
    
    if importlib.util.find_spec('PIL') is not None:
        from PIL import Image, PngImagePlugin
    else:
        import subprocess
        try:
            print('-' * 80, file=sys.stderr)
            print('| installing PIL (pillow) ...')
            print('-' * 80, file=sys.stderr)
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", 'pillow'],
                stdout=sys.stdout,
                stderr=sys.stderr
            )
        except Exception as e:
            msg = ''.join(traceback.TracebackException.from_exception(e).format())
            print(msg, file=sys.stderr)
            print('-' * 80, file=sys.stderr)
            print('| failed to install PIL (pillow). exit...', file=sys.stderr)
            print('-' * 80, file=sys.stderr)
            sys.exit(1)
        from PIL import Image, PngImagePlugin

    app = Flask(__name__, static_folder='.', static_url_path='')
    
    def atoi(text):
        return int(text) if text.isdigit() else text
    def natural_keys(text):
        return [ atoi(c) for c in re.split(r'(\d+)', text) ]
    def sorted_glob(path):
        return sorted(glob.glob(path), key=natural_keys)
    
    def get_saved_poses():
        dirpath = os.path.join(app.static_folder, 'saved_poses')
        for path in sorted_glob(f'{dirpath}/*.png'):
            yield Image.open(path)

    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
    def api_try(fn):
        @wraps(fn)
        def f(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                msg = ''.join(traceback.TracebackException.from_exception(e).format())
                print(msg, file=sys.stderr)
                return jsonify(result=str(e), ok=False)
        return f
    
    @app.route('/pose/all')
    @api_try
    def saved_poses():
        result = []
        for img in get_saved_poses():
            buffer = BytesIO()
            img.save(buffer, format='png')
            
            if not hasattr(img, 'text'):
                continue
            
            result.append({
                'name': img.text['name'],
                'image': base64.b64encode(buffer.getvalue()).decode('ascii'),
                'screen': json.loads(img.text['screen']),
                'camera': json.loads(img.text['camera']),
                'joints': json.loads(img.text['joints']),
            })
        return jsonify(result)
    
    def name2path(name: str):
        if not isinstance(name, str):
            raise ValueError(f'str object expected, but {type(name)}')
        if len(name) == 0:
            raise ValueError(f'empty name')
        if '.' in name or '/' in name or '\\' in name:
            raise ValueError(f'invalid name: {name}')
        path = os.path.realpath(os.path.join(app.static_folder, 'saved_poses', f'{name}.png'))
        prefix = os.path.realpath(os.path.join(app.static_folder, 'saved_poses'))
        if not path.startswith(prefix):
            raise ValueError(f'invalid name: {name}')
        return path
    
    @app.route('/pose/save', methods=['POST'])
    @api_try
    def save_pose():
        data = request.json
        
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
        
        return jsonify(result='pose saved', ok=True)
    
    @app.route('/pose/delete', methods=['POST'])
    @api_try
    def delete_pose():
        data = request.json
        filepath = name2path(data['name'])
        os.remove(filepath)
        return jsonify(result='pose deleted', ok=True)

    app.run(port=55502, debug=True)
