"""
Launcher Principal do Projeto - Casa Cuida (UNIVESP PI4)

Executa de forma automatizada e unificada:
1. Verificação e inicialização do banco SQLite
2. Carga inicial de dados de demonstração (48h)
3. Treinamento automático do modelo de Machine Learning (se ainda não existir)
4. Inicialização da API FastAPI de Telemetria (Porta 8000)
5. Inicialização do Dashboard NiceGUI (Porta 8501) com abertura no navegador
"""

import os
import sys
import time
import subprocess
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXEC = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(PYTHON_EXEC):
    PYTHON_EXEC = sys.executable

def main():
    print("\n========================================================")
    print("      INICIALIZADOR DO PROJETO INTEGRADOR UNIVESP       ")
    print("      CASA CUIDA: IoT + ML + DASHBOARD                  ")
    print("========================================================\n")
    
    # 1. Banco de Dados e Dados Iniciais
    print("[1/4] Inicializando banco de dados SQLite...")
    from src.database import init_db, popular_dados_demo
    init_db()
    popular_dados_demo(dias=2)
    print("  -> Banco de dados pronto com dados de demonstração.")
    
    # 2. Treinamento do Modelo ML (se não existir)
    modelo_path = os.path.join(ROOT_DIR, "models", "mold_risk_model.pkl")
    if not os.path.exists(modelo_path):
        print("[2/4] Treinando modelo de Machine Learning pela primeira vez...")
        from src.train_model import treinar_e_avaliar
        treinar_e_avaliar()
    else:
        print("[2/4] Modelo de Machine Learning já treinado e disponível.")

    # 3. Inicialização da API FastAPI
    print("[3/4] Iniciando API de Ingestão Telemétrica (FastAPI)...")
    cmd_api = [
        PYTHON_EXEC, "-m", "uvicorn", 
        "src.ingestion_api:app", 
        "--host", "127.0.0.1", 
        "--port", "8000"
    ]
    proc_api = subprocess.Popen(cmd_api, cwd=ROOT_DIR)
    time.sleep(2.0)
    print("  -> API online em: http://127.0.0.1:8000")
    print("  -> Documentação interativa (Swagger): http://127.0.0.1:8000/docs")

    # 4. Inicialização do Dashboard Web (shadcn/ui + React + Vite)
    print("\n[4/4] Iniciando Dashboard Web (React + shadcn/ui + Tailwind)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    cmd_dashboard = [npm_cmd, "run", "dev", "--", "--port", "8501"]
    proc_dash = subprocess.Popen(cmd_dashboard, cwd=os.path.join(ROOT_DIR, "frontend"), shell=True)
    
    print("\n========================================================")
    print("             SISTEMA TOTALMENTE EM OPERAÇÃO!            ")
    print("========================================================")
    print(" Dashboard Web : http://localhost:8501")
    print(" API / Swagger : http://127.0.0.1:8000/docs")
    print(" Emulador IoT  : Em outro terminal, execute:")
    print("                 .venv\\Scripts\\python.exe -m src.iot_emulator")
    print("\n Pressione Ctrl+C para encerrar todos os serviços.")
    print("========================================================\n")

    try:
        # Abre o navegador automaticamente
        time.sleep(3.0)
        webbrowser.open("http://localhost:8501")
        proc_dash.wait()
    except KeyboardInterrupt:
        print("\n-> Encerrando serviços...")
    finally:
        proc_api.terminate()
        proc_dash.terminate()
        print("-> Todos os serviços foram finalizados com segurança.")

if __name__ == "__main__":
    main()
