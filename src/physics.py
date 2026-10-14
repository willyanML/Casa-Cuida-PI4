"""
Módulo de Física Aplicada e Engenharia Psicrométrica
Projeto: Casa Cuida (UNIVESP PI4)

Contém formulações termodinâmicas consagradas pela ASHRAE e normas de
conservação predial para cálculo de Ponto de Orvalho, Déficit de Pressão de
Vapor (VPD) e categorização analítica de risco biológico.
"""

import math

def calcular_ponto_orvalho(temperatura: float, umidade: float) -> float:
    """
    Calcula o Ponto de Orvalho (°C) utilizando a aproximação de Magnus-Tetens.
    Equação amplamente adotada em meteorologia e engenharia térmica.
    
    T_d = (c * gamma) / (b - gamma)
    onde gamma = (b * T) / (c + T) + ln(RH / 100)
    com constantes de Magnus: b = 17.27, c = 237.7 °C.
    """
    if umidade <= 0.0:
        umidade = 0.01
    elif umidade > 100.0:
        umidade = 100.0

    b = 17.27
    c = 237.7

    try:
        gamma = ((b * temperatura) / (c + temperatura)) + math.log(umidade / 100.0)
        ponto_orvalho = (c * gamma) / (b - gamma)
        return round(ponto_orvalho, 2)
    except Exception:
        # Fallback de segurança para valores anômalos
        return round(temperatura - ((100 - umidade) / 5.0), 2)


def calcular_vpd(temperatura: float, umidade: float) -> float:
    """
    Calcula o Déficit de Pressão de Vapor (VPD) em kilopascals (kPa).
    VPD = VP_sat - VP_atual
    
    Indica a capacidade do ar de absorver umidade:
    - VPD baixo (< 0.4 kPa): Ar saturado, condensação fácil, alta proliferação de fungos.
    - VPD ideal (0.5 a 1.2 kPa): Equilíbrio térmico e respiratório.
    - VPD alto (> 1.6 kPa): Ar excessivamente seco, ressecamento de vias aéreas e alergias.
    """
    # Pressão de vapor de saturação (Tetens) em kPa
    vp_sat = 0.61078 * math.exp((17.27 * temperatura) / (temperatura + 237.3))
    # Pressão de vapor real
    vp_atual = vp_sat * (umidade / 100.0)
    vpd = vp_sat - vp_atual
    return round(max(0.0, vpd), 3)


def extrair_atributos_completos(temperatura: float, umidade: float) -> dict:
    """
    Realiza a engenharia de atributos psicrométricos a partir das grandezas brutas
    coletadas pelo sensor IoT físico.
    """
    orvalho = calcular_ponto_orvalho(temperatura, umidade)
    vpd = calcular_vpd(temperatura, umidade)
    delta_orvalho = round(temperatura - orvalho, 2)

    # Classificação analítica de referência
    # 0 = Seguro / Confortável
    # 1 = Atenção: Ar Seco / Risco Respiratório
    # 2 = Alerta Crítico: Risco de Mofo / Condensação
    if umidade < 35.0 or vpd > 1.5:
        classe_referencia = 1
        rotulo_referencia = "Ar Seco / Risco Respiratório"
    elif umidade >= 70.0 and delta_orvalho <= 4.0:
        classe_referencia = 2
        rotulo_referencia = "Alerta Crítico: Risco de Mofo"
    elif umidade >= 65.0 and delta_orvalho <= 5.5:
        classe_referencia = 2 if temperatura >= 21.0 else 0
        rotulo_referencia = "Alerta Crítico: Risco de Mofo" if classe_referencia == 2 else "Ambiente Seguro"
    else:
        classe_referencia = 0
        rotulo_referencia = "Ambiente Seguro"

    return {
        "temperatura": round(temperatura, 2),
        "umidade": round(umidade, 2),
        "ponto_orvalho": orvalho,
        "vpd": vpd,
        "delta_orvalho": delta_orvalho,
        "classe_referencia": classe_referencia,
        "rotulo_referencia": rotulo_referencia
    }
