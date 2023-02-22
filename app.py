from typing import Union

def ensure_install(module_name: str, lib_name: Union[str,None] = None):
    from importlib.util import find_spec
    
    if lib_name is None:
        lib_name = module_name
    
    if find_spec(module_name) is None:
        import subprocess
        try:
            print('-' * 80, file=sys.stderr)
            print(f'| installing {lib_name} ...', file=sys.stderr)
            print('-' * 80, file=sys.stderr)
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", lib_name],
                stdout=sys.stdout,
                stderr=sys.stderr
            )
        except Exception as e:
            msg = ''.join(traceback.TracebackException.from_exception(e).format())
            print(msg, file=sys.stderr)
            print('-' * 80, file=sys.stderr)
            print(f'| failed to install {lib_name}. exit...', file=sys.stderr)
            print('-' * 80, file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')

    import os, sys, traceback
    from functools import wraps
    
    ensure_install('flask')
    ensure_install('PIL', 'pillow')
    
    from flask import Flask, jsonify, request
    from common import posex_utils as posex
    
    app = Flask(__name__, static_folder='.', static_url_path='')
    
    posex.set_save_dir(os.path.join(app.static_folder, 'saved_poses'))
    
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
    def all_poses():
        return jsonify(list(posex.all_poses()))
    
    @app.route('/pose/save', methods=['POST'])
    @api_try
    def save_pose():
        data = request.json
        posex.save_pose(data)
        return jsonify(result='pose saved', ok=True)
    
    @app.route('/pose/delete', methods=['POST'])
    @api_try
    def delete_pose():
        data = request.json
        posex.delete_pose(data['name'])
        return jsonify(result='pose deleted', ok=True)
    
    @app.route('/pose/load', methods=['POST'])
    @api_try
    def load_pose():
        data = request.json
        return jsonify(posex.load_pose(data['name']))

    app.run(port=55502, debug=True)
