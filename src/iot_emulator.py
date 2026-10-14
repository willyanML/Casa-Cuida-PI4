"""
Emulador Interativo de Nó Sensor IoT (ESP32)
Projeto: Casa Cuida (UNIVESP PI4)

Simula o envio contínuo de pacotes JSON telemétricos via HTTP POST para a API,
permitindo demonstrar em tempo real a reação da Inteligência Artificial perante
diferentes eventos climáticos (dia seguro, chuva crítica com mofo, ar seco de inverno).
"""

import time
import random
import requests
import argparse
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api/telemetria"

CENARIOS = {
    "1": {
        "nome": "Dia Agradável (Ambiente Seguro / Conforto)",
        "temp_faixa": (21.5, 24.5),
        "umid_faixa": (48.0, 58.0),
        "desc": "Condições ideais de sono e conservação de tecidos e roupas."
    },
    "2": {
        "nome": "Frente Fria / Chuva Contínua (Alerta Crítico de Mofo)",
        "temp_faixa": (22.0, 25.0),
        "umid_faixa": (77.0, 89.0),
        "desc": "Condições perigosas de condensação! A IA deve disparar alerta de mofo."
    },
    "3": {
        "nome": "Inverno Seco / Baixa Umidade (Risco Respiratório)",
        "temp_faixa": (25.0, 29.0),
        "umid_faixa": (22.0, 33.0),
        "desc": "Ar excessivamente seco. Risco para crises de asma e rinite."
    }
}

SENSORES = [
    "esp32_quarto_01"
]

import os
IOT_API_KEY = os.environ.get("IOT_API_KEY", "casa-cuida-esp32-key-2026")

def enviar_leitura(sensor_id: str, temperatura: float, umidade: float) -> dict:
    """Envia uma leitura para a API com chave de autenticação e retorna a resposta."""
    payload = {
        "sensor_id": sensor_id,
        "temperatura": round(temperatura, 2),
        "umidade": round(umidade, 2)
    }
    headers = {
        "X-Sensor-Key": IOT_API_KEY,
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(API_URL, json=payload, headers=headers, timeout=3.0)
        if resp.status_code == 200:
            return resp.json()
        else:
            return {"erro": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"erro": f"Falha de conexão com a API ({API_URL}): {str(e)}"}

def executar_emulador(cenario_id: str = "1", sensor_id: str = "esp32_quarto_01", 
                       intervalo: float = 3.0, repeticoes: int = None):
    """Loop contínuo de transmissão telemétrica."""
    cenario = CENARIOS.get(cenario_id, CENARIOS["1"])
    print("\n========================================================")
    print("   EMULADOR DE SENSOR IOT (ESP32) - CASA CUIDA         ")
    print("========================================================")
    print(f" Sensor Ativo   : {sensor_id}")
    print(f" Cenário Atual  : {cenario['nome']}")
    print(f" Descrição      : {cenario['desc']}")
    print(f" Intervalo      : {intervalo} segundos por transmissão")
    print(f" Destino API    : {API_URL}")
    print(" Pressione Ctrl+C para interromper a qualquer momento.")
    print("========================================================\n")

    contador = 0
    while True:
        try:
            t_min, t_max = cenario["temp_faixa"]
            u_min, u_max = cenario["umid_faixa"]
            
            # Gera pequenas oscilações de ruído natural
            temp = random.uniform(t_min, t_max)
            umid = random.uniform(u_min, u_max)
            
            hora_atual = datetime.now().strftime("%H:%M:%S")
            print(f"[{hora_atual}] Transmitindo pacote IoT: Temp={temp:.1f}°C | Umid={umid:.1f}% ... ", end="", flush=True)
            
            resultado = enviar_leitura(sensor_id, temp, umid)
            
            if "diagnostico_ia" in resultado:
                diag = resultado["diagnostico_ia"]
                rotulo = diag["rotulo"]
                prob = diag["probabilidade"]
                fisica = resultado["fisica_psicrometrica"]
                orvalho = fisica["ponto_orvalho"]
                
                # Indicador de cor visual no terminal
                status_icon = "🟢" if "Seguro" in rotulo else ("🔴" if "Mofo" in rotulo else "🟡")
                print(f"{status_icon} [IA: {rotulo} ({prob})] (Orvalho: {orvalho}°C)")
            else:
                print(f"❌ Erro: {resultado.get('erro')}")

            contador += 1
            if repeticoes and contador >= repeticoes:
                break
                
            time.sleep(intervalo)
            
        except KeyboardInterrupt:
            print("\n\n-> Transmissão interrompida pelo usuário.")
            break

def menu_interativo():
    print("\nEscolha o Cenário de Demonstração:")
    print(" [1] Dia Normal / Agradável (Ambiente Seguro)")
    print(" [2] Chuva Intensa / Alta Umidade (Alerta Crítico de Mofo)")
    print(" [3] Ar Seco de Inverno (Alerta de Risco Respiratório)")
    
    escolha = input("\nDigite a opção desejada [1/2/3] (padrão=1): ").strip()
    if escolha not in ["1", "2", "3"]:
        escolha = "1"
        
    print("\nEscolha o Cômodo do Sensor:")
    for idx, s in enumerate(SENSORES, 1):
        print(f" [{idx}] {s}")
    escolha_s = input(f"Selecione o sensor [1-{len(SENSORES)}] (padrão=1): ").strip()
    sensor_id = SENSORES[0]
    if escolha_s in ["1", "2", "3"]:
        sensor_id = SENSORES[int(escolha_s) - 1]

    executar_emulador(cenario_id=escolha, sensor_id=sensor_id, intervalo=3.0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Emulador de nó IoT ESP32 para Casa Cuida")
    parser.add_argument("--cenario", type=str, choices=["1", "2", "3"], default=None, help="Cenário de teste")
    parser.add_argument("--sensor", type=str, default="esp32_quarto_01", help="ID do sensor")
    parser.add_argument("--intervalo", type=float, default=3.0, help="Intervalo em segundos entre transmissões")
    parser.add_argument("--repeticoes", type=int, default=None, help="Número máximo de pacotes (para testes)")
    
    args = parser.parse_args()
    if args.cenario:
        executar_emulador(cenario_id=args.cenario, sensor_id=args.sensor, 
                          intervalo=args.intervalo, repeticoes=args.repeticoes)
    else:
        menu_interativo()
