"""Inicializa a API (Flask) e o Frontend (React) juntos e encerra os processos ao sair."""
import http.server
import json
import os
from pathlib import Path
import shutil
import socketserver
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

root = Path(__file__).parent.absolute()
build_dir = root / 'frontend' / 'build'
env = os.environ.copy()

# Carrega variaveis do backend/.env caso existam
env_file = root / 'backend' / '.env'
if env_file.is_file():
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
                    os.environ[k.strip()] = v.strip()
    except Exception:
        pass

backend_dir = root / 'backend'
packages = backend_dir / 'venv2' / 'Lib' / 'site-packages'
pypath_elements = [str(backend_dir)]
if packages.exists():
    pypath_elements.append(str(packages))
if env.get('PYTHONPATH'):
    pypath_elements.append(env['PYTHONPATH'])
env['PYTHONPATH'] = os.pathsep.join(pypath_elements)
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if packages.exists() and str(packages) not in sys.path:
    sys.path.insert(1, str(packages))

try:
    import requests
except Exception:
    requests = None

venv_python = root / 'backend' / 'venv2' / 'Scripts' / 'python.exe'
python_cmd = str(venv_python) if venv_python.exists() else sys.executable

backend_proc = None
frontend_proc = None
httpd_server = None


def open_browser():
    url = 'http://localhost:3000'
    time.sleep(0.5)
    try:
        if os.name == 'nt' and hasattr(os, 'startfile'):
            os.startfile(url)
            return
    except Exception:
        pass
    try:
        webbrowser.open(url)
    except Exception:
        pass


class SPAProxyHandler(http.server.SimpleHTTPRequestHandler):
    """Serve os arquivos estaticos do React (frontend/build) e encaminha /api para o Flask."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(build_dir), **kwargs)

    def log_message(self, format, *args):
        pass

    def do_HEAD(self):
        self._dispatch('HEAD')

    def do_GET(self):
        self._dispatch('GET')

    def do_POST(self):
        self._dispatch('POST')

    def do_PUT(self):
        self._dispatch('PUT')

    def do_PATCH(self):
        self._dispatch('PATCH')

    def do_DELETE(self):
        self._dispatch('DELETE')

    def do_OPTIONS(self):
        self._dispatch('OPTIONS')

    def _dispatch(self, method):
        if self.path.startswith('/api'):
            self._proxy_to_backend(method)
            return

        if method in ('GET', 'HEAD'):
            clean_path = self.path.split('?')[0].split('#')[0].lstrip('/')
            target = (build_dir / clean_path).resolve() if clean_path else None
            try:
                if not (target and target.is_file() and str(target).startswith(str(build_dir.resolve()))):
                    self.path = '/index.html'
            except Exception:
                self.path = '/index.html'

            if method == 'GET':
                super().do_GET()
            else:
                super().do_HEAD()
        else:
            self.send_error(405, 'Metodo nao permitido')

    def end_headers(self):
        p = getattr(self, 'path', '')
        if p in ('/', '/index.html') or p.endswith('.html') or '/static/js/' in p or '/static/css/' in p:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def _proxy_to_backend(self, method):
        if method == 'OPTIONS':
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.send_header('Content-Length', '0')
            self.send_header('Connection', 'close')
            self.end_headers()
            return

        target_url = f'http://127.0.0.1:5000{self.path}'
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length > 0 else None

        headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'content-length', 'connection')}

        if requests is not None:
            try:
                resp = requests.request(
                    method,
                    target_url,
                    data=body,
                    headers=headers,
                    timeout=45,
                    allow_redirects=False
                )
                self.send_response(resp.status_code)
                for k, v in resp.headers.items():
                    if k.lower() not in ('transfer-encoding', 'connection', 'content-length', 'access-control-allow-origin'):
                        self.send_header(k, v)
                self.send_header('Content-Length', str(len(resp.content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(resp.content)
            except Exception as e:
                err_data = json.dumps({'error': f'Erro de conexao com o backend: {e}'}).encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_data)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(err_data)
        else:
            req = urllib.request.Request(target_url, data=body, method=method)
            for k, v in headers.items():
                req.add_header(k, v)
            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    self.send_response(resp.status)
                    for k, v in resp.headers.items():
                        if k.lower() not in ('transfer-encoding', 'connection', 'content-length', 'access-control-allow-origin'):
                            self.send_header(k, v)
                    content = resp.read()
                    self.send_header('Content-Length', str(len(content)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                    self.send_header('Access-Control-Allow-Headers', '*')
                    self.send_header('Connection', 'close')
                    self.end_headers()
                    self.wfile.write(content)
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                for k, v in e.headers.items():
                    if k.lower() not in ('transfer-encoding', 'connection', 'content-length', 'access-control-allow-origin'):
                        self.send_header(k, v)
                content = e.read()
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                err_data = json.dumps({'error': f'Erro de conexao com o backend: {e}'}).encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_data)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(err_data)


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def free_ports(*ports):
    """Encerra com seguranca processos antigos que estejam bloqueando as portas especificadas no Windows."""
    if os.name != 'nt':
        return
    current_pid = os.getpid()
    for port in ports:
        try:
            res = subprocess.run(
                f'netstat -ano | findstr LISTENING | findstr :{port}',
                shell=True,
                capture_output=True,
                text=True
            )
            for line in res.stdout.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and 'LISTENING' in parts:
                    pid = int(parts[-1])
                    if pid > 0 and pid != current_pid:
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                        time.sleep(0.3)
        except Exception:
            pass


def start_backend():
    global backend_proc
    try:
        with urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=1) as response:
            if response.status == 200:
                print('  [OK] API Backend ja esta em execucao.', flush=True)
                return
    except OSError:
        pass

    print('  [1/2] Iniciando API Backend...', flush=True)
    backend_proc = subprocess.Popen(
        [python_cmd, 'api.py'],
        cwd=str(root / 'backend'),
        env=env,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    )

    stderr_lines = []

    def _drain_stderr(pipe):
        try:
            for raw_line in iter(pipe.readline, b''):
                stderr_lines.append(raw_line.decode('utf-8', errors='replace'))
                if len(stderr_lines) > 200:
                    stderr_lines.pop(0)
        except Exception:
            pass
        finally:
            try:
                pipe.close()
            except Exception:
                pass

    threading.Thread(target=_drain_stderr, args=(backend_proc.stderr,), daemon=True).start()

    start_time = time.time()
    max_wait = 90  # Ate 90 segundos para suportar leitura de venv sobre rede (SMB/UNC)
    last_feedback = 0

    while time.time() - start_time < max_wait:
        if backend_proc.poll() is not None:
            time.sleep(0.5)
            err = ''.join(stderr_lines)
            raise RuntimeError(f'A API nao iniciou (processo encerrou com codigo {backend_proc.returncode}):\n{err}\nInstale backend/requirements.txt no Python.')
        try:
            with urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=1):
                elapsed = int(time.time() - start_time)
                print(f'  [OK] API Backend iniciada com sucesso em {elapsed}s!', flush=True)
                return
        except OSError:
            elapsed = int(time.time() - start_time)
            if elapsed >= 5 and elapsed - last_feedback >= 5:
                print(f'  [*] Aguardando API Backend carregar modulos ({elapsed}s)...', flush=True)
                last_feedback = elapsed
            time.sleep(0.5)

    err = ''.join(stderr_lines)
    raise RuntimeError(f'A API demorou demais para iniciar (tempo limite de {max_wait}s excedido).\nUltimos logs:\n{err}')


def find_node_npm():
    node = shutil.which('node.exe' if os.name == 'nt' else 'node')
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')

    if not node and os.name == 'nt':
        for cand in [
            Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'nodejs' / 'node.exe',
            Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)')) / 'nodejs' / 'node.exe',
            Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'node' / 'node.exe',
        ]:
            if cand.is_file():
                node = str(cand)
                break

    if not npm and os.name == 'nt':
        for cand in [
            Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'nodejs' / 'npm.cmd',
            Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)')) / 'nodejs' / 'npm.cmd',
            Path(os.environ.get('APPDATA', '')) / 'npm' / 'npm.cmd',
        ]:
            if cand.is_file():
                npm = str(cand)
                break

    return node, npm


def should_rebuild_frontend():
    if '--rebuild' in sys.argv:
        return True
    index_file = build_dir / 'index.html'
    if not index_file.is_file():
        return True
    try:
        build_mtime = index_file.stat().st_mtime
        src_dir = root / 'frontend' / 'src'
        if src_dir.exists():
            for p in src_dir.rglob('*'):
                if p.is_file() and p.stat().st_mtime > build_mtime:
                    return True
    except Exception:
        pass
    return False


def try_rebuild_frontend():
    print('  [*] Detectadas alteracoes recentes no codigo React. Recompilando frontend/build...', flush=True)
    node, npm = find_node_npm()
    react_build_script = root / 'frontend' / 'node_modules' / 'react-scripts' / 'scripts' / 'build.js'

    env_build = env.copy()
    env_build['CI'] = 'false'
    env_build['GENERATE_SOURCEMAP'] = 'false'

    cmd = None
    if react_build_script.is_file() and node:
        cmd = [node, str(react_build_script)]
    elif npm:
        cmd = [npm, 'run', 'build']

    if cmd:
        try:
            print(f"  [*] Executando comando de build em frontend/...", flush=True)
            frontend_dir = str(root / 'frontend')
            if os.name == 'nt' and frontend_dir.startswith('\\\\'):
                # Webpack não resolve caminhos UNC diretamente; pushd mapeia letra de unidade temporária
                quoted_cmd = ' '.join(f'"{c}"' if ' ' in str(c) else str(c) for c in cmd)
                unc_cmd = f'pushd "{frontend_dir}" && {quoted_cmd} && popd'
                res = subprocess.run(unc_cmd, env=env_build, shell=True)
            else:
                res = subprocess.run(cmd, cwd=frontend_dir, env=env_build, shell=(os.name == 'nt'))
            if res.returncode == 0:
                print('  [OK] Frontend recompilado com sucesso com as novas alteracoes!', flush=True)
                return True
            else:
                print(f'  [AVISO] Recompilacao finalizou com status {res.returncode}. Prosseguindo com build existente...', flush=True)
        except Exception as e:
            print(f'  [AVISO] Nao foi possivel recompilar automaticamente: {e}', flush=True)
    else:
        print('  [AVISO] Node.js ou npm nao encontrados no sistema para recompilacao automatica.', flush=True)
    return False


def run_frontend():
    global frontend_proc, httpd_server

    if '--dev' not in sys.argv:
        if should_rebuild_frontend():
            try_rebuild_frontend()

    use_build = (build_dir / 'index.html').is_file() and ('--dev' not in sys.argv)

    if use_build:
        print('  [2/2] Iniciando Painel Web (Frontend)...', flush=True)
        for attempt in range(3):
            try:
                httpd_server = ThreadedTCPServer(('0.0.0.0', 3000), SPAProxyHandler)
                break
            except OSError as e:
                print(f'  [AVISO] Porta 3000 em uso ({e}). Liberando porta...', flush=True)
                free_ports(3000)
                time.sleep(0.5)

        if not httpd_server:
            raise RuntimeError('Nao foi possivel iniciar o servidor web na porta 3000.')

        server_thread = threading.Thread(target=httpd_server.serve_forever, daemon=True)
        server_thread.start()
        print('  [OK] Painel Web iniciado com sucesso!', flush=True)
        print('', flush=True)
        print('=====================================================', flush=True)
        print('         NefroSmart - Sistema em Execucao', flush=True)
        print('=====================================================', flush=True)
        print('  Acesse no navegador: http://localhost:3000', flush=True)
        print('  O navegador abrira automaticamente em instantes.', flush=True)
        print('  Mantenha esta janela aberta enquanto utiliza.', flush=True)
        print('  Para fechar o sistema, pressione Ctrl+C.', flush=True)
        print('=====================================================', flush=True)

        threading.Thread(target=open_browser, daemon=True).start()

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    else:
        print('  [2/2] Iniciando modo desenvolvimento (Node.js)...', flush=True)
        node_exe = shutil.which('node.exe' if os.name == 'nt' else 'node')
        react_script = root / 'frontend' / 'node_modules' / 'react-scripts' / 'scripts' / 'start.js'
        npm_exe = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')

        if react_script.exists() and node_exe:
            frontend_cmd = [node_exe, str(react_script)]
        elif npm_exe:
            frontend_cmd = [npm_exe, 'start']
        else:
            raise RuntimeError('Node.js / npm nao encontrado.')

        env_dev = env.copy()
        env_dev['CI'] = 'true'
        threading.Thread(target=open_browser, daemon=True).start()
        frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(root / 'frontend'), env=env_dev)
        frontend_proc.wait()


def main():
    try:
        print('=====================================================', flush=True)
        print('            Iniciando o NefroSmart...', flush=True)
        print('=====================================================', flush=True)
        # Libera portas 3000 e 5000 caso hajam processos zumbis anteriores
        free_ports(3000, 5000)
        start_backend()
        run_frontend()
    except KeyboardInterrupt:
        print('\nEncerrando NefroSmart...', flush=True)
    finally:
        if httpd_server:
            try:
                httpd_server.shutdown()
            except Exception:
                pass
        for proc in (frontend_proc, backend_proc):
            if proc and proc.poll() is None:
                if os.name == 'nt':
                    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], capture_output=True)
                else:
                    proc.terminate()


if __name__ == '__main__':
    main()
