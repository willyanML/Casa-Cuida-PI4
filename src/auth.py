"""
Módulo de Autenticação e Segurança (Casa Cuida)
Projeto Integrador IV - UNIVESP (Boituva-SP)

Implementa hashing criptográfico seguro de senhas (PBKDF2-HMAC-SHA256)
e geração/validação de tokens assinados (HMAC-SHA256) sem dependências externas.
"""

import os
import time
import hmac
import hashlib
import secrets
from typing import Optional

# Chave secreta da aplicação para assinatura de sessões
SECRET_KEY = os.environ.get("SECRET_KEY", "univesp-pi4-casa-cuida-secret-key-2026")

# Chave padrão de ingestão dos nós IoT (ESP32 Físico e Emulador)
IOT_API_KEY = os.environ.get("IOT_API_KEY", "casa-cuida-esp32-key-2026")

# Senha padrão do administrador (usada no primeiro boot caso não haja usuários)
ADMIN_DEFAULT_PASSWORD = os.environ.get("ADMIN_PASSWORD", "250328")


def hash_senha(senha: str, salt: Optional[bytes] = None) -> str:
    """Gera hash seguro PBKDF2-HMAC-SHA256 com salt aleatório de 16 bytes."""
    if salt is None:
        salt = os.urandom(16)
    # 100.000 iterações garantem proteção contra força bruta
    hash_bytes = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}:{hash_bytes.hex()}"


def verificar_senha(senha: str, hash_salvo: str) -> bool:
    """Compara a senha fornecida contra o hash armazenado de forma imune a timing attacks."""
    try:
        partes = hash_salvo.split(":")
        if len(partes) != 2:
            return False
        salt_hex, hash_hex = partes
        salt = bytes.fromhex(salt_hex)
        hash_bytes = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(hash_bytes.hex(), hash_hex)
    except Exception:
        return False


def gerar_token(username: str, duracao_horas: int = 24) -> str:
    """
    Gera um token de sessão assinado contendo:
    payload = base64(username:exp_timestamp:nonce)
    assinatura = hmac_sha256(payload, SECRET_KEY)
    token = payload.assinatura
    """
    expira_em = int(time.time()) + (duracao_horas * 3600)
    nonce = secrets.token_hex(8)
    conteudo = f"{username}:{expira_em}:{nonce}"
    payload = conteudo.encode("utf-8").hex()
    assinatura = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{assinatura}"


def validar_token(token: Optional[str]) -> Optional[str]:
    """
    Valida a assinatura criptográfica e a expiração do token.
    Retorna o username caso o token seja íntegro e ativo, ou None se inválido/expirado.
    """
    if not token or "." not in token:
        return None
    try:
        payload_hex, assinatura_recebida = token.split(".", 1)
        # Verifica assinatura com compare_digest para prevenir timing attacks
        assinatura_esperada = hmac.new(SECRET_KEY.encode("utf-8"), payload_hex.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(assinatura_recebida, assinatura_esperada):
            return None

        # Decodifica e inspeciona expiração
        conteudo = bytes.fromhex(payload_hex).decode("utf-8")
        partes = conteudo.split(":")
        if len(partes) != 3:
            return None

        username, expira_str, _ = partes
        expira_em = int(expira_str)
        if time.time() > expira_em:
            return None  # Token expirado

        return username
    except Exception:
        return None


def validar_iot_key(header_key: Optional[str]) -> bool:
    """Verifica se a chave transmitida pelo ESP32 confere com a IOT_API_KEY."""
    if not header_key:
        return False
    return hmac.compare_digest(header_key.strip(), IOT_API_KEY.strip())
