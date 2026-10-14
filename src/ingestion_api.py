"""
API de Ingestão Telemétrica IoT e Inferência em Tempo Real
Projeto: Casa Cuida (UNIVESP PI4 - Boituva-SP)

Servidor HTTP de alta velocidade construído em FastAPI. Recebe as leituras
do ESP32 físico ou do emulador, processa os atributos psicrométricos,
submete ao modelo de Machine Learning e armazena na série temporal.
Inclui autenticação segura de usuários (sessões HMAC/Cookie) e nós IoT (X-Sensor-Key).
"""

import os
import io
import csv
import json
import joblib
import pandas as pd
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.physics import extrair_atributos_completos
from src.database import (
    init_db, salvar_leitura, obter_ultimas_leituras,
    obter_estatisticas_gerais, popular_dados_demo, obter_usuario
)
from src.auth import (
    hash_senha, verificar_senha, gerar_token, validar_token, validar_iot_key
)

app = FastAPI(
    title="Casa Cuida - IoT Telemetry & ML Ingestion API",
    description="API de telemetria e IA para o Projeto Integrador UNIVESP (Boituva-SP)",
    version="1.1.0"
)

# Habilita CORS para permitir conexões de qualquer cliente
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "mold_risk_model.pkl")
_modelo_cache = None


def carregar_modelo():
    """Carrega o modelo treinado de Machine Learning do disco com fallback gracioso."""
    global _modelo_cache
    if _modelo_cache is not None:
        return _modelo_cache
    if os.path.exists(MODEL_PATH):
        try:
            _modelo_cache = joblib.load(MODEL_PATH)
            return _modelo_cache
        except Exception as e:
            print(f"Aviso ao carregar modelo: {e}")
    return None


# ============================================================================
# DEPENDÊNCIA DE AUTENTICAÇÃO DE SESSÃO
# ============================================================================

def obter_usuario_logado(request: Request, authorization: Optional[str] = Header(None)) -> str:
    """
    Verifica se a requisição possui um token válido via cabeçalho Authorization
    (Bearer <token>) ou via Cookie HttpOnly (access_token).
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        token = request.cookies.get("access_token")

    username = validar_token(token)
    if not username:
        raise HTTPException(
            status_code=401,
            detail="Sessão não autorizada ou expirada. Faça login para acessar o sistema."
        )
    return username


# ============================================================================
# MODELOS DE ENTRADA PYDANTIC
# ============================================================================

class LoginIn(BaseModel):
    username: str = Field(..., description="Nome de usuário para login")
    password: str = Field(..., description="Senha do usuário")


class TelemetriaIn(BaseModel):
    sensor_id: str = Field(default="esp32_quarto_01", description="Identificador único do nó sensor")
    temperatura: float = Field(..., ge=-10.0, le=60.0, description="Temperatura em graus Celsius")
    umidade: float = Field(..., ge=0.0, le=100.0, description="Umidade relativa percentual")
    timestamp: Optional[str] = Field(default=None, description="Data/hora opcional (ISO format)")
    api_key: Optional[str] = Field(default=None, description="Chave IoT opcional transmitida no payload")


class SimularIn(BaseModel):
    temperatura: float = Field(..., ge=-10.0, le=60.0)
    umidade: float = Field(..., ge=0.0, le=100.0)


# ============================================================================
# ROTAS PÚBLICAS E DE STATUS
# ============================================================================

@app.on_event("startup")
def startup_event():
    init_db()
    carregar_modelo()


@app.get("/api/status")
def checar_status():
    """Endpoint público de monitoramento da saúde do serviço."""
    modelo = carregar_modelo()
    stats = obter_estatisticas_gerais()
    return {
        "sistema": "Casa Cuida",
        "polo": "Boituva-SP · UNIVESP",
        "status": "online",
        "hora_servidor": datetime.now().isoformat(),
        "modelo_ml_carregado": modelo is not None,
        "total_leituras_gravadas": stats.get("total_leituras", 0)
    }


# ============================================================================
# ROTAS DE AUTENTICAÇÃO
# ============================================================================

@app.post("/api/auth/login")
def login(dados: LoginIn, response: Response):
    """Autentica o usuário e emite um token de sessão com cookie HttpOnly."""
    usuario = obter_usuario(dados.username)
    if not usuario or not verificar_senha(dados.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

    token = gerar_token(usuario["username"], duracao_horas=24)

    # Grava o token em cookie seguro (HttpOnly previne XSS)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=86400,
        samesite="lax",
        secure=False  # Permite funcionamento tanto em localhost quanto em proxy HTTPS
    )

    return {
        "status": "sucesso",
        "token": token,
        "usuario": {
            "username": usuario["username"],
            "role": usuario.get("role", "admin")
        }
    }


@app.get("/api/auth/me")
def verificar_sessao(username: str = Depends(obter_usuario_logado)):
    """Valida se o usuário continua com sessão ativa e retorna seus dados."""
    usuario = obter_usuario(username)
    return {
        "autenticado": True,
        "usuario": {
            "username": username,
            "role": usuario.get("role", "admin") if usuario else "admin"
        }
    }


@app.post("/api/auth/logout")
def logout(response: Response):
    """Encerra a sessão do usuário removendo o cookie de acesso."""
    response.delete_cookie(key="access_token")
    return {"status": "sucesso", "mensagem": "Sessão encerrada com sucesso."}


# ============================================================================
# INGESTÃO TELEMÉTRICA IoT (PROTEGIDO POR X-SENSOR-KEY)
# ============================================================================

@app.post("/api/telemetria")
def receber_telemetria(
    dados: TelemetriaIn,
    request: Request,
    x_sensor_key: Optional[str] = Header(None, alias="X-Sensor-Key"),
    key: Optional[str] = None
):
    """
    Endpoint principal acionado pelo ESP32 ou emulador IoT.
    Protegido pela chave X-Sensor-Key (no cabeçalho, no corpo ou em query param).
    Calcula física psicrométrica, infere risco com IA e persiste no banco.
    """
    chave_enviada = (
        x_sensor_key
        or request.headers.get("x-sensor-key")
        or request.headers.get("X-Sensor-Key")
        or dados.api_key
        or key
    )
    if not validar_iot_key(chave_enviada):
        raise HTTPException(
            status_code=401,
            detail="Acesso negado: Chave IoT ('X-Sensor-Key') ausente ou inválida."
        )

    attr = extrair_atributos_completos(dados.temperatura, dados.umidade)
    modelo = carregar_modelo()

    # Inferência via Machine Learning (ou fallback físico)
    if modelo is not None:
        df_input = pd.DataFrame([{
            "temperatura": attr["temperatura"],
            "umidade": attr["umidade"],
            "ponto_orvalho": attr["ponto_orvalho"],
            "vpd": attr["vpd"],
            "delta_orvalho": attr["delta_orvalho"]
        }])
        classe_pred = int(modelo.predict(df_input)[0])
        try:
            probas = modelo.predict_proba(df_input)[0]
            probabilidade = round(float(probas[classe_pred]) * 100.0, 1)
        except Exception:
            probabilidade = 92.0
    else:
        classe_pred = attr["classe_referencia"]
        probabilidade = 88.0

    # Determinação dos rótulos e recomendações para a família (HCD)
    if classe_pred == 2:
        rotulo = "Alerta Crítico: Risco de Mofo"
        rec = "Abra as portas do guarda-roupa e acione a ventilação por 40 min."
    elif classe_pred == 1:
        rotulo = "Ar Seco / Risco Respiratório"
        rec = "Ar seco. Hidrate o ambiente ou use umidificador no quarto."
    else:
        rotulo = "Ambiente Seguro"
        rec = "Microclima ideal para preservação de roupas, couro e calçados."

    # Salva no banco de dados
    leitura_id = salvar_leitura(
        sensor_id=dados.sensor_id,
        temperatura=attr["temperatura"],
        umidade=attr["umidade"],
        ponto_orvalho=attr["ponto_orvalho"],
        vpd=attr["vpd"],
        risco_classe=classe_pred,
        risco_rotulo=rotulo,
        probabilidade=probabilidade,
        recomendacao=rec,
        timestamp=dados.timestamp
    )

    return {
        "status": "sucesso",
        "id_leitura": leitura_id,
        "diagnostico_ia": {
            "classe_risco": classe_pred,
            "rotulo": rotulo,
            "probabilidade": f"{probabilidade}%",
            "probabilidade_num": probabilidade,
            "recomendacao": rec
        },
        "fisica_psicrometrica": {
            "ponto_orvalho": attr["ponto_orvalho"],
            "vpd_kpa": attr["vpd"],
            "delta_orvalho": attr["delta_orvalho"]
        }
    }


# ============================================================================
# ROTAS ANALÍTICAS PROTEGIDAS (EXIGEM LOGIN WEB)
# ============================================================================

@app.get("/api/leituras")
def listar_leituras(limite: int = 50, sensor_id: Optional[str] = None,
                    _: str = Depends(obter_usuario_logado)):
    """Retorna as leituras mais recentes para a interface de telemetria."""
    return {"leituras": obter_ultimas_leituras(limite=limite, sensor_id=sensor_id)}


@app.get("/api/metricas")
def metricas_gerais(_: str = Depends(obter_usuario_logado)):
    """Retorna métricas agregadas gerais para os cards do dashboard."""
    return obter_estatisticas_gerais()


@app.post("/api/simular")
def simular_cenario(dados: SimularIn, _: str = Depends(obter_usuario_logado)):
    """Simulador do Laboratório de IA: calcula física e inferência sem gravar."""
    attr = extrair_atributos_completos(dados.temperatura, dados.umidade)
    modelo = carregar_modelo()
    if modelo is not None:
        df_input = pd.DataFrame([{
            "temperatura": attr["temperatura"],
            "umidade": attr["umidade"],
            "ponto_orvalho": attr["ponto_orvalho"],
            "vpd": attr["vpd"],
            "delta_orvalho": attr["delta_orvalho"]
        }])
        classe_pred = int(modelo.predict(df_input)[0])
        try:
            probas = modelo.predict_proba(df_input)[0]
            probabilidade = round(float(probas[classe_pred]) * 100.0, 1)
        except Exception:
            probabilidade = 90.0
    else:
        classe_pred = attr["classe_referencia"]
        probabilidade = 85.0

    if classe_pred == 2:
        rotulo = "Alerta Crítico: Risco de Mofo"
        rec = "Abra as portas do guarda-roupa e acione a ventilação por 40 min."
    elif classe_pred == 1:
        rotulo = "Ar Seco / Risco Respiratório"
        rec = "Ar seco. Hidrate o ambiente ou use umidificador no quarto."
    else:
        rotulo = "Ambiente Seguro"
        rec = "Microclima ideal para preservação de roupas, couro e calçados."

    return {
        "status": "sucesso",
        "diagnostico_ia": {
            "classe_risco": classe_pred,
            "rotulo": rotulo,
            "probabilidade": f"{probabilidade}%",
            "probabilidade_num": probabilidade,
            "recomendacao": rec
        },
        "fisica_psicrometrica": {
            "ponto_orvalho": attr["ponto_orvalho"],
            "vpd_kpa": attr["vpd"],
            "delta_orvalho": attr["delta_orvalho"]
        }
    }


@app.get("/api/metadata_ia")
def obter_metadados_ia(_: str = Depends(obter_usuario_logado)):
    """Retorna os dados acadêmicos e métricas de treino do modelo de ML."""
    meta_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "model_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


@app.post("/api/leituras/limpar")
def limpar_historico_leituras(_: str = Depends(obter_usuario_logado)):
    """Remove todo o histórico de leituras para início com sensores reais."""
    with obter_conexao() as ctx:
        ctx.execute("DELETE FROM leituras")
    return {"status": "sucesso", "mensagem": "Histórico de leituras apagado com sucesso."}


@app.post("/api/demo/popular")
def recarregar_dados_demo(dias: int = 2, _: str = Depends(obter_usuario_logado)):
    """Regenera dados demonstrativos de telemetria."""
    popular_dados_demo(dias=dias, limpar=True)
    return {"status": "sucesso", "mensagem": f"Histórico de {dias} dias gerado com sucesso."}


@app.get("/api/exportar/csv")
def exportar_csv(_: str = Depends(obter_usuario_logado)):
    """Gera um arquivo CSV com todo o histórico gravado para inclusão no relatório do PI."""
    leituras = obter_ultimas_leituras(limite=5000)
    if not leituras:
        raise HTTPException(status_code=404, detail="Nenhum dado encontrado para exportação.")

    output = io.StringIO()
    colunas = list(leituras[0].keys())
    writer = csv.DictWriter(output, fieldnames=colunas)
    writer.writeheader()
    writer.writerows(leituras)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=telemetria_casa_cuida.csv"}
    )


# ============================================================================
# SERVIÇO DE SPA ESTÁTICA REACT + VITE COMPILADA
# ============================================================================

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="Not Found")
        target = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(target) and os.path.isfile(target) and not target.endswith("index.html"):
            return FileResponse(target)
        return FileResponse(
            os.path.join(FRONTEND_DIST, "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
