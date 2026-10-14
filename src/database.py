"""
Camada de Persistência e Banco de Dados (Dual SQLite / PostgreSQL)
Projeto: Casa Cuida (UNIVESP PI4 - Boituva-SP)

Armazena em série temporal as leituras transmitidas pelo nó IoT (ESP32/Emulador),
os diagnósticos de IA e os usuários administrativos cadastrados.
Opera nativamente com SQLite (desenvolvimento local) e PostgreSQL Serverless (Neon/Render).
"""

import os
import sqlite3
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from src.physics import extrair_atributos_completos
from src.auth import hash_senha, ADMIN_DEFAULT_PASSWORD

def carregar_env():
    """Carrega automaticamente variáveis de ambiente de .env.local e .env se existirem."""
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for nome in [".env.local", ".env"]:
        caminho = os.path.join(raiz, nome)
        if os.path.exists(caminho):
            try:
                with open(caminho, "r", encoding="utf-8") as f:
                    for linha in f:
                        linha = linha.strip()
                        if linha and not linha.startswith("#") and "=" in linha:
                            chave, valor = linha.split("=", 1)
                            chave = chave.strip()
                            valor = valor.strip().strip('"').strip("'")
                            if chave not in os.environ:
                                os.environ[chave] = valor
            except Exception as e:
                print(f"Aviso ao ler {nome}: {e}")

carregar_env()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "telemetria.db")
DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE_URL_UNPOOLED = os.environ.get("DATABASE_URL_UNPOOLED", DATABASE_URL)

# Variável de controle do driver
_USANDO_POSTGRES = False
_psycopg2 = None

if DATABASE_URL:
    try:
        import psycopg2
        import psycopg2.extras
        _psycopg2 = psycopg2
        _USANDO_POSTGRES = True
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        if DATABASE_URL_UNPOOLED and DATABASE_URL_UNPOOLED.startswith("postgres://"):
            DATABASE_URL_UNPOOLED = DATABASE_URL_UNPOOLED.replace("postgres://", "postgresql://", 1)
    except ImportError:
        print("Aviso: DATABASE_URL detectada, mas psycopg2 não está instalado. Usando SQLite local.")
        _USANDO_POSTGRES = False


class ConexaoContexto:
    """Gerenciador de contexto unificado que normaliza o cursor para SQLite e Postgres."""
    def __init__(self, direct: bool = False):
        self.usando_pg = _USANDO_POSTGRES
        self.direct = direct
        self.conn = None

    def __enter__(self):
        if self.usando_pg and _psycopg2 and DATABASE_URL:
            # Usa conexão direta (sem pgbouncer) para DDL / init_db, e pooled para queries do app
            url = DATABASE_URL_UNPOOLED if (self.direct and DATABASE_URL_UNPOOLED) else DATABASE_URL
            self.conn = _psycopg2.connect(url, cursor_factory=_psycopg2.extras.RealDictCursor)
        else:
            os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
            self.conn = sqlite3.connect(DB_PATH)
            self.conn.row_factory = sqlite3.Row
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            if exc_type is None:
                self.conn.commit()
            else:
                self.conn.rollback()
            self.conn.close()

    def execute(self, sql: str, params: tuple = ()):
        """Executa comandos SQL adaptando marcadores '?' para '%s' quando no PostgreSQL."""
        cursor = self.conn.cursor()
        query = sql
        if self.usando_pg:
            query = query.replace("?", "%s")
        cursor.execute(query, params)
        return cursor

    def executemany(self, sql: str, params_seq: list):
        """Executa comandos múltiplos adaptando marcadores para Postgres."""
        cursor = self.conn.cursor()
        query = sql
        if self.usando_pg:
            query = query.replace("?", "%s")
        cursor.executemany(query, params_seq)
        return cursor


def obter_conexao(direct: bool = False) -> ConexaoContexto:
    """Retorna o gerenciador de contexto de conexão ativo."""
    return ConexaoContexto(direct=direct)


_DB_INICIALIZADO = False


def init_db(force: bool = False):
    """Inicializa as tabelas de sensores, leituras e usuários se não existirem."""
    global _DB_INICIALIZADO
    if _DB_INICIALIZADO and not force:
        return
    with obter_conexao(direct=True) as ctx:
        # Tabela de Sensores
        ctx.execute("""
            CREATE TABLE IF NOT EXISTS sensores (
                id TEXT PRIMARY KEY,
                localizacao TEXT NOT NULL,
                descricao TEXT,
                ativo INTEGER DEFAULT 1,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de Leituras (Série Temporal)
        if ctx.usando_pg:
            ctx.execute("""
                CREATE TABLE IF NOT EXISTS leituras (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    sensor_id TEXT NOT NULL,
                    temperatura REAL NOT NULL,
                    umidade REAL NOT NULL,
                    ponto_orvalho REAL NOT NULL,
                    vpd REAL NOT NULL,
                    risco_classe INTEGER NOT NULL,
                    risco_rotulo TEXT NOT NULL,
                    probabilidade REAL NOT NULL,
                    recomendacao TEXT NOT NULL
                )
            """)
        else:
            ctx.execute("""
                CREATE TABLE IF NOT EXISTS leituras (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    sensor_id TEXT NOT NULL,
                    temperatura REAL NOT NULL,
                    umidade REAL NOT NULL,
                    ponto_orvalho REAL NOT NULL,
                    vpd REAL NOT NULL,
                    risco_classe INTEGER NOT NULL,
                    risco_rotulo TEXT NOT NULL,
                    probabilidade REAL NOT NULL,
                    recomendacao TEXT NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES sensores (id)
                )
            """)

        # Tabela de Usuários (Autenticação Web)
        if ctx.usando_pg:
            ctx.execute("""
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'admin',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        else:
            ctx.execute("""
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'admin',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

        # Índices de performance
        ctx.execute("CREATE INDEX IF NOT EXISTS idx_leituras_timestamp ON leituras(timestamp DESC)")
        ctx.execute("CREATE INDEX IF NOT EXISTS idx_leituras_sensor ON leituras(sensor_id)")

        try:
            # Garante sensor padrão do Guarda-Roupa
            for sid, loc, desc in [
                ('esp32_quarto_01', 'Guarda-Roupa · Quarto Principal', 'Nó IoT ESP32 com sensor DHT22')
            ]:
                if ctx.usando_pg:
                    ctx.execute("""
                        INSERT INTO sensores (id, localizacao, descricao)
                        VALUES (?, ?, ?)
                        ON CONFLICT (id) DO UPDATE
                        SET localizacao = EXCLUDED.localizacao,
                            descricao = EXCLUDED.descricao
                    """, (sid, loc, desc))
                else:
                    ctx.execute("""
                        INSERT OR REPLACE INTO sensores (id, localizacao, descricao)
                        VALUES (?, ?, ?)
                    """, (sid, loc, desc))

            # Migração e limpeza de sensores legados (produção e local)
            ctx.execute("DELETE FROM sensores WHERE id IN ('esp32_quarto_bebe', 'esp32_sala')")
            ctx.execute("DELETE FROM leituras WHERE sensor_id IN ('esp32_quarto_bebe', 'esp32_sala') OR recomendacao LIKE '%sono reparador%' OR recomendacao LIKE '%conservação de bens%' OR timestamp < '2026-10-30'")
            ctx.execute(
                "UPDATE leituras SET recomendacao = ? WHERE risco_classe = 0 AND recomendacao LIKE ?",
                ('Microclima ideal para preservação de roupas, couro e calçados.', '%sono reparador%')
            )
            ctx.execute(
                "UPDATE leituras SET recomendacao = ? WHERE risco_classe = 1 AND recomendacao LIKE ?",
                ('Ar seco. Hidrate o ambiente ou use umidificador no quarto.', '%bacia com água%')
            )
        except Exception as e:
            print(f"[DB] Aviso não-bloqueante na migração de sensores: {e}")

    _DB_INICIALIZADO = True
    try:
        # Garante existência do usuário administrador padrão
        garantir_usuario_padrao()
    except Exception as e:
        print(f"[DB] Aviso na garantia do usuário padrão: {e}")


def obter_usuario(username: str) -> Optional[Dict[str, Any]]:
    """Busca os dados de um usuário pelo seu nome de login."""
    with obter_conexao() as ctx:
        cur = ctx.execute("SELECT * FROM usuarios WHERE username = ?", (username.strip().lower(),))
        row = cur.fetchone()
        return dict(row) if row else None


def criar_usuario(username: str, password_hash: str, role: str = "admin") -> bool:
    """Cadastra um novo usuário no sistema."""
    try:
        with obter_conexao() as ctx:
            ctx.execute("""
                INSERT INTO usuarios (username, password_hash, role)
                VALUES (?, ?, ?)
            """, (username.strip().lower(), password_hash, role))
        return True
    except Exception as e:
        print(f"Erro ao criar usuário {username}: {e}")
        return False


def garantir_usuario_padrao():
    """Garante que o usuário administrador 'casacuida' exista no banco de dados com as credenciais ativas."""
    hash_padrao = hash_senha(ADMIN_DEFAULT_PASSWORD)
    user = obter_usuario("casacuida")
    if not user:
        criar_usuario("casacuida", hash_padrao, role="admin")
        print("[AUTH] Usuário padrão 'casacuida' provisionado com sucesso.")
    else:
        with obter_conexao() as ctx:
            ctx.execute("UPDATE usuarios SET password_hash = ? WHERE username = ?", (hash_padrao, "casacuida"))


def salvar_leitura(sensor_id: str, temperatura: float, umidade: float, 
                   ponto_orvalho: float, vpd: float, risco_classe: int, 
                   risco_rotulo: str, probabilidade: float, recomendacao: str,
                   timestamp: Optional[str] = None) -> int:
    """Insere uma nova leitura telemétrica no banco de dados."""
    if timestamp is None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with obter_conexao() as ctx:
        cur = ctx.execute("""
            INSERT INTO leituras (
                timestamp, sensor_id, temperatura, umidade, ponto_orvalho,
                vpd, risco_classe, risco_rotulo, probabilidade, recomendacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp, sensor_id, temperatura, umidade, ponto_orvalho,
            vpd, risco_classe, risco_rotulo, probabilidade, recomendacao
        ))
        if ctx.usando_pg:
            return 1
        return cur.lastrowid or 1


def obter_ultimas_leituras(limite: int = 100, sensor_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retorna as leituras mais recentes em ordem cronológica decrescente."""
    with obter_conexao() as ctx:
        if sensor_id and sensor_id != "Todos":
            cur = ctx.execute("""
                SELECT * FROM leituras 
                WHERE sensor_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (sensor_id, limite))
        else:
            cur = ctx.execute("""
                SELECT * FROM leituras 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (limite,))
        rows = cur.fetchall()
        # Converte registros para dicionários com timestamp formatado como string
        resultado = []
        for r in rows:
            d = dict(r)
            if hasattr(d.get("timestamp"), "strftime"):
                d["timestamp"] = d["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            else:
                d["timestamp"] = str(d.get("timestamp", ""))
            resultado.append(d)
        return resultado


def obter_estatisticas_gerais() -> Dict[str, Any]:
    """Retorna agregados estatísticos para os cartões de KPI do dashboard."""
    with obter_conexao() as ctx:
        cur = ctx.execute("""
            SELECT 
                COUNT(*) as total_leituras,
                AVG(temperatura) as media_temp,
                AVG(umidade) as media_umidade,
                MAX(temperatura) as max_temp,
                MIN(temperatura) as min_temp,
                MAX(umidade) as max_umidade,
                MIN(umidade) as min_umidade,
                SUM(CASE WHEN risco_classe = 2 THEN 1 ELSE 0 END) as alertas_mofo,
                SUM(CASE WHEN risco_classe = 1 THEN 1 ELSE 0 END) as alertas_secura
            FROM leituras
        """)
        row = cur.fetchone()
        return dict(row) if row else {}


def popular_dados_demo(dias: int = 2, sensor_id: str = "esp32_quarto_01", limpar: bool = False):
    """Gera um histórico verossímil de telemetria IoT de Boituva-SP para o guarda-roupa."""
    init_db()
    agora = datetime.now()
    inicio = agora - timedelta(days=dias)
    passo = timedelta(minutes=15)

    registros = []
    atual = inicio

    while atual <= agora:
        hora = atual.hour
        base_temp = 20.0 + 7.0 * math_sin_cycle(hora) + random.uniform(-0.8, 0.8)

        if dias >= 2 and atual > (agora - timedelta(hours=20)) and atual < (agora - timedelta(hours=8)):
            base_umid = 78.0 + random.uniform(-3.0, 7.0)
            base_temp = 22.0 + random.uniform(-1.0, 1.0)
        else:
            base_umid = 55.0 - 15.0 * math_sin_cycle(hora) + random.uniform(-2.5, 2.5)

        base_temp = round(max(15.0, min(38.0, base_temp)), 2)
        base_umid = round(max(20.0, min(95.0, base_umid)), 2)

        attr = extrair_atributos_completos(base_temp, base_umid)
        classe = attr["classe_referencia"]

        if classe == 2:
            rotulo = "Alerta Crítico: Risco de Mofo"
            rec = "Abra as portas do guarda-roupa e acione a ventilação por 40 min."
            prob = round(random.uniform(82.0, 97.0), 1)
        elif classe == 1:
            rotulo = "Ar Seco / Risco Respiratório"
            rec = "Ar seco. Hidrate o ambiente ou use umidificador no quarto."
            prob = round(random.uniform(75.0, 92.0), 1)
        else:
            rotulo = "Ambiente Seguro"
            rec = "Microclima ideal para preservação de roupas, couro e calçados."
            prob = round(random.uniform(85.0, 99.0), 1)

        registros.append((
            atual.strftime("%Y-%m-%d %H:%M:%S"),
            sensor_id,
            base_temp,
            base_umid,
            attr["ponto_orvalho"],
            attr["vpd"],
            classe,
            rotulo,
            prob,
            rec
        ))
        atual += passo

    with obter_conexao() as ctx:
        if limpar:
            ctx.execute("DELETE FROM leituras")
            ctx.executemany("""
                INSERT INTO leituras (
                    timestamp, sensor_id, temperatura, umidade, ponto_orvalho,
                    vpd, risco_classe, risco_rotulo, probabilidade, recomendacao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, registros)
        else:
            cur = ctx.execute("SELECT COUNT(*) as total FROM leituras")
            row = cur.fetchone()
            total = row["total"] if isinstance(row, dict) else row[0]
            if total < 20:
                ctx.executemany("""
                    INSERT INTO leituras (
                        timestamp, sensor_id, temperatura, umidade, ponto_orvalho,
                        vpd, risco_classe, risco_rotulo, probabilidade, recomendacao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, registros)


def math_sin_cycle(hora: int) -> float:
    """Função utilitária para ciclar curva diurna (pico às 14h, vale às 04h)."""
    import math
    rad = ((hora - 8) / 24.0) * 2 * math.pi
    return (math.sin(rad) + 1.0) / 2.0
