import type { Leitura, MetricasGerais, MetadadosIA, SimulacaoResponse, Usuario, AuthResponse, SessionResponse } from "@/types"

const API_BASE = "/api"
const TOKEN_KEY = "casa_cuida_token"

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("smart_home_care_token")
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // fallback se localStorage estiver bloqueado
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Falha na autenticação" }))
    throw new Error(err.detail || "Usuário ou senha inválidos")
  }
  const data: AuthResponse = await res.json()
  setStoredToken(data.token)
  return data
}

export async function checkSessionApi(): Promise<Usuario | null> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) {
      setStoredToken(null)
      return null
    }
    const data: SessionResponse = await res.json()
    return data.usuario
  } catch {
    return null
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders()
    })
  } catch {
    // ignora falha de rede no logout
  } finally {
    setStoredToken(null)
  }
}

export async function fetchLeituras(limite = 120, sensorId?: string): Promise<Leitura[]> {
  const params = new URLSearchParams({ limite: limite.toString() })
  if (sensorId && sensorId !== "Todos") {
    params.append("sensor_id", sensorId)
  }
  const res = await fetch(`${API_BASE}/leituras?${params.toString()}`, {
    headers: getAuthHeaders()
  })
  if (res.status === 401) {
    setStoredToken(null)
    throw new Error("UNAUTHORIZED")
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.leituras || []
}

export async function fetchMetricas(): Promise<MetricasGerais> {
  const res = await fetch(`${API_BASE}/metricas`, {
    headers: getAuthHeaders()
  })
  if (res.status === 401) {
    setStoredToken(null)
    throw new Error("UNAUTHORIZED")
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function fetchStatus(): Promise<{ status: string; modelo_ml_carregado: boolean; total_leituras_gravadas: number; polo?: string }> {
  const res = await fetch(`${API_BASE}/status`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function fetchMetadadosIA(): Promise<MetadadosIA | null> {
  try {
    const res = await fetch(`${API_BASE}/metadata_ia`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function simularCenario(temperatura: number, umidade: number): Promise<SimulacaoResponse> {
  const res = await fetch(`${API_BASE}/simular`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ temperatura, umidade }),
  })
  if (res.status === 401) {
    setStoredToken(null)
    throw new Error("UNAUTHORIZED")
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function limparLeiturasApi(): Promise<void> {
  const res = await fetch(`${API_BASE}/leituras/limpar`, {
    method: "POST",
    headers: getAuthHeaders()
  })
  if (res.status === 401) {
    setStoredToken(null)
    throw new Error("UNAUTHORIZED")
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function recarregarDadosDemo(dias = 2): Promise<void> {
  const res = await fetch(`${API_BASE}/demo/popular?dias=${dias}`, {
    method: "POST",
    headers: getAuthHeaders()
  })
  if (res.status === 401) {
    setStoredToken(null)
    throw new Error("UNAUTHORIZED")
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export function getExportarCsvUrl(): string {
  return `${API_BASE}/exportar/csv`
}
