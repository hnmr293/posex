import mimetypes
mimetypes.add_type('application/javascript', '.js')

from flask import Flask

app = Flask(__name__, static_folder='./static', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('html/index.html')

app.run(port=55502, debug=True)
