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


def calcular_folga_orvalho(temperatura: float, umidade: float) -> float:
    """Retorna a folga térmica em °C até atingir a temperatura de orvalho."""
    orvalho = calcular_ponto_orvalho(temperatura, umidade)
    return round(temperatura - orvalho, 2)


def simular_condensacao_noturna(temperatura: float, umidade: float) -> dict:
    """
    Simula o risco de condensação caso a temperatura caia 2 °C, 3 °C ou 4 °C durante a madrugada,
    considerando a umidade absoluta constante no guarda-roupa confinado.
    """
    orvalho = calcular_ponto_orvalho(temperatura, umidade)
    delta_atual = round(temperatura - orvalho, 2)

    # Pressão de vapor real atual (kPa)
    vp_sat_atual = 0.61078 * math.exp((17.27 * temperatura) / (temperatura + 237.3))
    vp_real = vp_sat_atual * (umidade / 100.0)

    simulacoes = []
    for queda in [2.0, 3.0, 4.0]:
        temp_sim = round(temperatura - queda, 1)
        vp_sat_sim = 0.61078 * math.exp((17.27 * temp_sim) / (temp_sim + 237.3))
        # Nova umidade relativa estimada sob resfriamento
        ur_sim = round(min(100.0, (vp_real / vp_sat_sim) * 100.0), 1) if vp_sat_sim > 0 else 100.0
        condensa = temp_sim <= orvalho or ur_sim >= 99.0

        if condensa:
            risco = "Crítico (Condensa)"
            cor = "danger"
        elif ur_sim >= 75.0 or (temp_sim - orvalho) <= 2.0:
            risco = "Alto Risco"
            cor = "warning"
        else:
            risco = "Seguro"
            cor = "safe"

        simulacoes.append({
            "queda_celsius": queda,
            "temperatura_prevista": temp_sim,
            "umidade_prevista": ur_sim,
            "condensa": condensa,
            "folga_restante": round(temp_sim - orvalho, 1),
            "risco": risco,
            "cor": cor
        })

    return {
        "ponto_orvalho": orvalho,
        "folga_atual": delta_atual,
        "simulacoes": simulacoes
    }


def analisar_risco_materiais(temperatura: float, umidade: float, folga_orvalho: float) -> dict:
    """
    Avalia a vulnerabilidade específica por tipo de material presente no guarda-roupa,
    em conformidade com normas da EPA, OMS, ASHRAE 160 e Smithsonian Conservation Institute.
    """
    # 1. Couro & Calçados (Smithsonian / Canadian Conservation Institute: 45% a 65%)
    if umidade >= 70.0:
        couro = {
            "status": "Risco Crítico de Fungos",
            "nivel": "danger",
            "faixa_ideal": "45% a 65% UR",
            "explicacao": "O couro é composto de colágeno e gorduras que nutrem esporos fúngicos com umidade acima de 65%.",
            "acao": "Retire calçados de caixas plásticas fechadas, passe flanela seca e aplique sílica desumidificadora."
        }
    elif umidade > 65.0:
        couro = {
            "status": "Atenção: Umidade Elevada",
            "nivel": "warning",
            "faixa_ideal": "45% a 65% UR",
            "explicacao": "Limiar inicial de absorção fúngica em artigos de couro e camurça.",
            "acao": "Promova circulação de ar no móvel e verifique calçados guardados no fundo."
        }
    elif umidade < 40.0:
        couro = {
            "status": "Risco de Ressecamento",
            "nivel": "warning",
            "faixa_ideal": "45% a 65% UR",
            "explicacao": "Ar excessivamente seco desidrata as fibras naturais do couro, podendo provocar microfissuras e rigidez.",
            "acao": "Evite correntes de ar quente direto e hidrate peças de couro legítimo se o tempo seco persistir."
        }
    else:
        couro = {
            "status": "Preservação Ideal",
            "nivel": "safe",
            "faixa_ideal": "45% a 65% UR",
            "explicacao": "Equilíbrio higrométrico perfeito para sapatos, bolsas e jaquetas conforme normas de conservação.",
            "acao": "Condição perfeita. Mantenha o armário organizado e limpo."
        }

    # 2. Roupas & Fibras Têxteis (EPA / OMS: 30% a 60%)
    if umidade >= 70.0:
        tecidos = {
            "status": "Risco de Mofo & Ácaros",
            "nivel": "danger",
            "faixa_ideal": "30% a 60% UR",
            "explicacao": "Fibras de algodão, linho e lã retêm umidade estagnada, gerando odor de guardado e esporos em 48h.",
            "acao": "Não guarde roupas usadas ou com resquício de suor. Abra o armário e areje casacos pesados."
        }
    elif umidade > 60.0:
        tecidos = {
            "status": "Retenção de Umidade",
            "nivel": "warning",
            "faixa_ideal": "30% a 60% UR",
            "explicacao": "Acima de 60% (teto recomendado pela EPA) as fibras começam a acumular vapor confinado.",
            "acao": "Abra as portas do móvel por 30 a 40 minutos em horários de sol e baixa umidade externa."
        }
    else:
        tecidos = {
            "status": "Fibras Seguras & Protegidas",
            "nivel": "safe",
            "faixa_ideal": "30% a 60% UR",
            "explicacao": "Ambiente sem vapor residual nos tecidos; proliferação de ácaros e bactérias inibida.",
            "acao": "Condição estável. Roupas protegidas."
        }

    # 3. Estrutura & Parede (ASHRAE 160: folga térmica > 3.5 °C e UR < 65%)
    if folga_orvalho <= 2.5 or umidade >= 75.0:
        madeira = {
            "status": "Alerta: Microcondensação na Parede",
            "nivel": "danger",
            "faixa_ideal": "Folga > 3.5 °C e UR < 65%",
            "explicacao": "Fundo do armário encostado em parede fria corre risco iminente de orvalho líquido, estufando MDF e aglomerado.",
            "acao": "Afaste o guarda-roupa 5 cm da parede externa para permitir fluxo de ar e posicione desumidificador no piso do móvel."
        }
    elif folga_orvalho <= 4.0 or umidade >= 65.0:
        madeira = {
            "status": "Atenção: Queda Noturna Perigosa",
            "nivel": "warning",
            "faixa_ideal": "Folga > 3.5 °C e UR < 65%",
            "explicacao": "Queda de temperatura na madrugada pode zerar a folga térmica nas áreas de contato com a alvenaria.",
            "acao": "Monitore se o fundo do guarda-roupa está gelado ou úmido ao toque pela manhã."
        }
    else:
        madeira = {
            "status": "Estrutura e Fundo Secos",
            "nivel": "safe",
            "faixa_ideal": "Folga > 3.5 °C e UR < 65%",
            "explicacao": "Boa margem térmica de isolamento. Madeira e fundo do armário livres de condensação.",
            "acao": "Espaçamento e ventilação adequados."
        }

    return {
        "couro": couro,
        "tecidos": tecidos,
        "madeira": madeira
    }


def gerar_diagnostico_preventivo_detalhado(temperatura: float, umidade: float) -> dict:
    """
    Gera o diagnóstico de prevenção física consolidado, cruzando ponto de orvalho,
    simulação noturna de condensação, matriz de risco de materiais e plano prático de ação.
    """
    orvalho = calcular_ponto_orvalho(temperatura, umidade)
    folga = round(temperatura - orvalho, 2)
    vpd = calcular_vpd(temperatura, umidade)
    sim_noturna = simular_condensacao_noturna(temperatura, umidade)
    materiais = analisar_risco_materiais(temperatura, umidade, folga)

    # Guia prático de arejamento e desumidificação
    if umidade >= 70.0:
        guia_arejamento = "Abra as portas do guarda-roupa entre 11h e 15h por 45 minutos em dias ensolarados. Mantenha portas fechadas à noite ou durante chuvas externas."
        guia_desumidificador = "Ação urgente: posicione pote desumidificador de cloreto de cálcio ou sachês de sílica nas prateleiras inferiores e gavetas."
    elif umidade >= 60.0:
        guia_arejamento = "Ventile o guarda-roupa por 30 minutos em horário seco do dia para equalizar o ar com o ambiente externo."
        guia_desumidificador = "Recomendado colocar sachê de sílica gel na sapateira e verificar o nível de líquido dos potes antimofo."
    elif umidade < 40.0:
        guia_arejamento = "Mantenha as portas fechadas para preservar a umidade natural do couro e calçados durante períodos muito secos."
        guia_desumidificador = "Desumidificadores podem ser temporariamente vedados para não reduzir ainda mais a umidade das peças de couro."
    else:
        guia_arejamento = "Arejamento de rotina: abra as portas por 20 minutos 2 vezes por semana para renovação do ar confinado."
        guia_desumidificador = "Condição excelente. Potes ou sachês antimofo operando em regime estável de preservação preventiva."

    return {
        "temperatura": round(temperatura, 2),
        "umidade": round(umidade, 2),
        "ponto_orvalho": orvalho,
        "folga_orvalho": folga,
        "vpd_kpa": vpd,
        "simulacao_noturna": sim_noturna,
        "materiais": materiais,
        "guia_acao": {
            "arejamento": guia_arejamento,
            "desumidificador": guia_desumidificador
        }
    }
