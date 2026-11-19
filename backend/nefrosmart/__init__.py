from flask import Flask
import oracledb
from .config import Config
from .local_auth import read_local_auth

def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    local_auth = read_local_auth()
    app.config['LOCAL_ADMIN_USER'] = local_auth.get('username', '')
    app.config['LOCAL_ADMIN_HASH'] = local_auth.get('password_hash', '')
    if not app.config['JWT_SECRET']:
        app.config['JWT_SECRET'] = local_auth.get('jwt_secret', '')
    if config:
        app.config.update(config)
    from .remote_api import register_remote_api
    register_remote_api(app)
    if app.config['ORACLE_CLIENT_DIR']:
        oracledb.init_oracle_client(lib_dir=app.config['ORACLE_CLIENT_DIR'])
    from .routes.login import bp as login
    from .routes.lookups import bp as lookups
    from .routes.patients import bp as patients
    from .routes.signatures import bp as signatures
    for blueprint in (login, lookups, patients, signatures):
        app.register_blueprint(blueprint)
    @app.get('/api/health')
    def health():
        return {'status': 'ok'}
    return app
