export interface Leitura {
  id: number
  timestamp: string
  sensor_id: string
  temperatura: number
  umidade: number
  ponto_orvalho: number
  vpd: number
  risco_classe: number
  risco_rotulo: string
  probabilidade: number
  recomendacao: string
}

export interface MetricasGerais {
  total_leituras: number
  media_temp: number
  media_umidade: number
  max_temp: number
  min_temp: number
  max_umidade: number
  min_umidade: number
  alertas_mofo: number
  alertas_secura: number
}

export interface DiagnosticoIA {
  classe_risco: number
  rotulo: string
  probabilidade: string
  probabilidade_num: number
  recomendacao: string
}

export interface FisicaPsicrometrica {
  ponto_orvalho: number
  vpd_kpa: number
  delta_orvalho: number
}

export interface SimulacaoQueda {
  queda_celsius: number
  temperatura_prevista: number
  umidade_prevista: number
  condensa: boolean
  folga_restante: number
  risco: string
  cor: "danger" | "warning" | "safe"
}

export interface RiscoMaterialItem {
  status: string
  nivel: "danger" | "warning" | "safe"
  faixa_ideal: string
  explicacao: string
  acao: string
}

export interface DiagnosticoPreventivo {
  temperatura: number
  umidade: number
  ponto_orvalho: number
  folga_orvalho: number
  vpd_kpa: number
  simulacao_noturna: {
    ponto_orvalho: number
    folga_atual: number
    simulacoes: SimulacaoQueda[]
  }
  materiais: {
    couro: RiscoMaterialItem
    tecidos: RiscoMaterialItem
    madeira: RiscoMaterialItem
  }
  guia_acao: {
    arejamento: string
    desumidificador: string
  }
}

export interface SimulacaoResponse {
  status: string
  diagnostico_ia: DiagnosticoIA
  fisica_psicrometrica: FisicaPsicrometrica
  diagnostico_preventivo?: DiagnosticoPreventivo
}

export interface MetadadosIA {
  modelo_escolhido: string
  features: string[]
  classes: Record<string, string>
  metricas: {
    acuracia: number
    f1_score_macro: number
    cv_score: number
    total_treino: number
    total_teste: number
  }
  comparativo_modelos: Array<{
    modelo: string
    acuracia: number
    f1_macro: number
    cv_score: number
  }>
  matriz_confusao: number[][]
  importancia_atributos: Record<string, number>
}

export interface Usuario {
  username: string
  role: string
}

export interface AuthResponse {
  status: string
  token: string
  usuario: Usuario
}

export interface SessionResponse {
  autenticado: boolean
  usuario: Usuario
}
