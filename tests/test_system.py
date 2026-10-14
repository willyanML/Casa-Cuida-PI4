"""
Suíte de Testes Automatizados - Casa Cuida (UNIVESP PI4)
Executa validação ponta a ponta: física, banco de dados, machine learning e API.
"""

import os
import pytest
import joblib
import pandas as pd
from fastapi.testclient import TestClient

from src.physics import calcular_ponto_orvalho, calcular_vpd, extrair_atributos_completos
from src.database import init_db, salvar_leitura, obter_ultimas_leituras, obter_estatisticas_gerais
from src.ingestion_api import app

client = TestClient(app)

def test_physics_calculations():
    """Valida se as fórmulas psicrométricas produzem valores corretos perante a ASHRAE."""
    # Cenário 1: 25°C e 50% de umidade relativa
    orvalho = calcular_ponto_orvalho(25.0, 50.0)
    assert 13.5 <= orvalho <= 14.5, f"Ponto de orvalho esperado ~13.9°C, obtido {orvalho}"
    
    vpd = calcular_vpd(25.0, 50.0)
    assert 1.4 <= vpd <= 1.7, f"VPD esperado ~1.58 kPa, obtido {vpd}"
    
    # Cenário 2: Alta saturação (24°C e 90% umidade)
    attr_sat = extrair_atributos_completos(24.0, 90.0)
    assert attr_sat["classe_referencia"] == 2, "Deveria ser classificado como Risco de Mofo"
    assert attr_sat["delta_orvalho"] < 3.0, "Delta térmico até orvalho deve ser baixo na saturação"

def test_database_operations():
    """Valida criação de tabelas, inserção e consulta no SQLite."""
    init_db()
    
    leitura_id = salvar_leitura(
        sensor_id="teste_unitario",
        temperatura=23.5,
        umidade=55.0,
        ponto_orvalho=14.0,
        vpd=1.2,
        risco_classe=0,
        risco_rotulo="Ambiente Seguro",
        probabilidade=96.0,
        recomendacao="Ideal para conservação."
    )
    assert leitura_id is not None
    assert leitura_id > 0
    
    leituras = obter_ultimas_leituras(limite=5, sensor_id="teste_unitario")
    assert len(leituras) >= 1
    assert leituras[0]["sensor_id"] == "teste_unitario"
    assert leituras[0]["temperatura"] == 23.5

def test_machine_learning_inference():
    """Valida se o modelo serializado Random Forest carrega e prediz com coerência."""
    modelo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "mold_risk_model.pkl")
    assert os.path.exists(modelo_path), "Modelo mold_risk_model.pkl deve existir no diretório models/"
    
    modelo = joblib.load(modelo_path)
    
    # Teste de cenário extremo de mofo (Temp=25°C, Umid=88%)
    attr_mofo = extrair_atributos_completos(25.0, 88.0)
    df_mofo = pd.DataFrame([{
        "temperatura": attr_mofo["temperatura"],
        "umidade": attr_mofo["umidade"],
        "ponto_orvalho": attr_mofo["ponto_orvalho"],
        "vpd": attr_mofo["vpd"],
        "delta_orvalho": attr_mofo["delta_orvalho"]
    }])
    pred = int(modelo.predict(df_mofo)[0])
    assert pred == 2, f"Cenário de umidade 88% deve ser predito como Classe 2 (Mofo). Predito: {pred}"

def test_api_endpoints():
    """Valida a API de ingestão FastAPI via requisições simuladas do sensor ESP32."""
    # Teste do status
    resp_status = client.get("/api/status")
    assert resp_status.status_code == 200
    dados_status = resp_status.json()
    assert dados_status["status"] == "online"
    assert dados_status["modelo_ml_carregado"] is True
    
    # Teste do envio telemétrico sem chave (deve ser rejeitado)
    payload = {
        "sensor_id": "esp32_teste_api",
        "temperatura": 24.5,
        "umidade": 82.0
    }
    resp_tele_sem_chave = client.post("/api/telemetria", json=payload)
    assert resp_tele_sem_chave.status_code == 401

    # Teste do envio telemétrico com chave autorizada X-Sensor-Key
    headers = {"X-Sensor-Key": "casa-cuida-esp32-key-2026"}
    resp_tele = client.post("/api/telemetria", json=payload, headers=headers)
    assert resp_tele.status_code == 200
    dados_tele = resp_tele.json()
    assert dados_tele["status"] == "sucesso"
    assert "diagnostico_ia" in dados_tele
    assert dados_tele["diagnostico_ia"]["classe_risco"] == 2

    # Teste de autenticação de usuário no dashboard
    resp_login = client.post("/api/auth/login", json={"username": "casacuida", "password": "250328"})
    assert resp_login.status_code == 200
    token = resp_login.json()["token"]
    assert len(token) > 20

    # Teste de acesso a rota protegida com Bearer token
    resp_leituras = client.get("/api/leituras", headers={"Authorization": f"Bearer {token}"})
    assert resp_leituras.status_code == 200
