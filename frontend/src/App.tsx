import { useState, useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  LineChart as LineChartIcon,
  BrainCircuit,
  TableProperties,
  GraduationCap,
  Menu,
  X,
  RotateCw,
  Trash2,
  Home,
  Cpu,
  Wifi,
  LogOut,
  User,
  MapPin,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { VisaoGeral } from "@/components/VisaoGeral"
import { MetricasGraficos } from "@/components/MetricasGraficos"
import { LaboratorioIA } from "@/components/LaboratorioIA"
import { TabelaTelemetria } from "@/components/TabelaTelemetria"
import { DossieAcademico } from "@/components/DossieAcademico"
import { LoginPage } from "@/components/LoginPage"
import { fetchLeituras, limparLeiturasApi, checkSessionApi, logoutApi, setStoredToken } from "@/lib/api"
import type { Leitura, Usuario } from "@/types"

type Pagina = "visao_geral" | "metricas" | "laboratorio_ia" | "tabela_telemetria" | "dossie_academico"

const SENSOR_GUARDA_ROUPA = "esp32_quarto_01"

export function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true)
  const [pagina, setPagina] = useState<Pagina>("visao_geral")
  const [leituras, setLeituras] = useState<Leitura[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("casa_cuida_font_scale")
      return saved ? parseFloat(saved) : 1.0
    } catch {
      return 1.0
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [academicoAberto, setAcademicoAberto] = useState<boolean>(false)

  // Aplica o redimensionamento acessível no elemento raiz <html> para que todas as classes Tailwind (rem) escalem imediatamente
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`
    try {
      localStorage.setItem("casa_cuida_font_scale", fontScale.toString())
    } catch {
      // fallback se localStorage indisponível
    }
    return () => {
      document.documentElement.style.fontSize = "100%"
    }
  }, [fontScale])

  // Abre a seção acadêmica automaticamente caso a página atual seja uma dela
  useEffect(() => {
    if (pagina === "laboratorio_ia" || pagina === "dossie_academico") {
      setAcademicoAberto(true)
    }
  }, [pagina])

  // Suporte a token e escala inicial via query params
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tokenParam = params.get("token")
      const scaleParam = params.get("scale")
      const pageParam = params.get("page") as Pagina
      if (tokenParam) {
        setStoredToken(tokenParam)
      }
      if (scaleParam) {
        const val = parseFloat(scaleParam)
        if (!isNaN(val) && val >= 0.8 && val <= 1.4) {
          setFontScale(val)
        }
      }
      if (pageParam && ["visao_geral", "metricas", "laboratorio_ia", "tabela_telemetria", "dossie_academico"].includes(pageParam)) {
        setPagina(pageParam)
      }
    } catch {
      // fallback
    }
  }, [])

  // 1. Verificação inicial de sessão
  useEffect(() => {
    let montado = true
    const verificar = async () => {
      try {
        const u = await checkSessionApi()
        if (montado) {
          setUsuario(u)
          setCheckingAuth(false)
        }
      } catch {
        if (montado) {
          setUsuario(null)
          setCheckingAuth(false)
        }
      }
    }
    verificar()
    return () => {
      montado = false
    }
  }, [])

  // 2. Carregamento de telemetria
  const carregarDados = useCallback(async () => {
    if (!usuario) return
    try {
      setLoading(true)
      const data = await fetchLeituras(500, SENSOR_GUARDA_ROUPA)
      setLeituras(data)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        setUsuario(null)
      } else {
        console.error("Erro ao carregar telemetria:", err)
      }
    } finally {
      setLoading(false)
    }
  }, [usuario])

  // Polling a cada 4s quando autenticado
  useEffect(() => {
    if (!usuario) return
    carregarDados()
    const timer = setInterval(() => {
      carregarDados()
    }, 4000)
    return () => clearInterval(timer)
  }, [carregarDados, usuario])

  const handleLimparDados = async () => {
    if (!window.confirm("Deseja realmente limpar as leituras anteriores para iniciar a telemetria do ESP32 do zero?")) return
    try {
      setLoading(true)
      await limparLeiturasApi()
      await carregarDados()
    } catch (err) {
      console.error("Erro ao limpar leituras:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logoutApi()
    setUsuario(null)
    setLeituras([])
  }

  // Se estiver checando a autenticação, exibe splash de carregamento
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 animate-pop-in">
          <div className="w-14 h-14 rounded-2xl bg-[#0284C7]/20 border border-[#0284C7]/40 flex items-center justify-center text-[#38BDF8] shadow-lg shadow-[#0284C7]/20 animate-pulse-subtle">
            <Home className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold tracking-tight text-white">Casa Cuida</h1>
            <p className="text-xs text-[#94A3B8]">Conectando ao sistema...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
        </div>
      </div>
    )
  }

  // Se não estiver logado, exibe a tela de login
  if (!usuario) {
    return <LoginPage onLoginSuccess={(u) => setUsuario(u)} />
  }

  // Identificação do status do ambiente
  const ultima = leituras[leituras.length - 1]
  const classeRisco = ultima?.risco_classe ?? 0
  const rotuloRisco = ultima?.risco_rotulo ?? "Ambiente Seguro"

  const navPrincipal = [
    { id: "visao_geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "metricas", label: "Métricas & Gráficos", icon: LineChartIcon },
    { id: "tabela_telemetria", label: "Histórico de Leituras", icon: TableProperties },
  ] as const

  const navAcademico = [
    { id: "laboratorio_ia", label: "Simulador de Clima", icon: BrainCircuit },
    { id: "dossie_academico", label: "Dossiê Acadêmico", icon: GraduationCap },
  ] as const

  const todosNavItems = [...navPrincipal, ...navAcademico]

  return (
    <div
      className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col antialiased selection:bg-[#0284C7]/30 selection:text-white"
    >
      <div className="flex flex-1 relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar (Desktop + Mobile Drawer) */}
        <aside
          className={`fixed lg:sticky top-0 z-50 h-screen w-72 bg-[#0F172A] border-r border-white/10 flex flex-col justify-between p-4 transition-transform duration-250 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Top Identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0284C7]/30 to-[#0F172A] border border-[#0284C7]/50 flex items-center justify-center text-[#38BDF8] shadow-lg shadow-[#0284C7]/20">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white tracking-tight leading-none">
                    Casa Cuida
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-[#94A3B8]">
                      Monitor de Guarda-Roupa
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="lg:hidden p-1 text-[#94A3B8] hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block px-2 mb-1.5">
                Principal
              </span>
              {navPrincipal.map((item) => {
                const Icon = item.icon
                const ativo = pagina === item.id
                return (
                  <Button
                    key={item.id}
                    variant={ativo ? "active" : "ghost"}
                    className={`w-full justify-start gap-2.5 text-xs h-9 px-3 transition-all duration-150 cursor-pointer ${
                      ativo
                        ? "bg-[#0284C7]/15 text-[#38BDF8] border-l-4 border-[#0284C7] font-semibold shadow-inner"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => {
                      setPagina(item.id)
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                )
              })}

              {/* Seção Agrupada: Avançado / Acadêmico (UNIVESP PI4) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAcademicoAberto(!academicoAberto)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-[#64748B] hover:text-[#94A3B8] uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-[#38BDF8]/60" />
                    Avançado / Acadêmico
                  </span>
                  {academicoAberto ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>

                {academicoAberto && (
                  <div className="mt-1 space-y-1 pl-1 border-l border-white/5 ml-2 animate-fade-in">
                    {navAcademico.map((item) => {
                      const Icon = item.icon
                      const ativo = pagina === item.id
                      return (
                        <Button
                          key={item.id}
                          variant={ativo ? "active" : "ghost"}
                          className={`w-full justify-start gap-2 text-xs h-8 px-2.5 transition-all duration-150 cursor-pointer ${
                            ativo
                              ? "bg-[#0284C7]/15 text-[#38BDF8] border-l-2 border-[#0284C7] font-semibold"
                              : "text-[#64748B] hover:text-white hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setPagina(item.id)
                            setMobileMenuOpen(false)
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Ponto Monitorado: Guarda-Roupa */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block px-1">
                Ponto Monitorado
              </span>
              <div className="rounded-xl p-3 bg-[#080C14] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Guarda-Roupa
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-[#64748B]" />
                    ESP32 + DHT22
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">GPIO 4</span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block px-1">
                Ações Rápidas
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={carregarDados}
                  disabled={loading}
                  className="w-full text-xs h-8 border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <RotateCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparDados}
                  disabled={loading}
                  className="w-full text-xs h-8 border-white/10 text-[#94A3B8] hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/5 cursor-pointer"
                  title="Apaga os dados de teste anteriores para começar limpo"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-400" />
                  Limpar
                </Button>
              </div>
            </div>

            {/* Acessibilidade */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block px-1">
                Acessibilidade
              </span>
              <div className="flex items-center gap-1.5 bg-[#080C14] p-1 rounded-lg border border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 h-7 text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    fontScale < 1.0 ? "text-[#38BDF8] bg-white/10" : "text-[#94A3B8] hover:text-white"
                  }`}
                  onClick={() => setFontScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
                  title="Diminuir tamanho da fonte (A-)"
                >
                  A-
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 h-7 text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    fontScale === 1.0 ? "text-[#38BDF8] bg-white/10" : "text-[#94A3B8] hover:text-white"
                  }`}
                  onClick={() => setFontScale(1.0)}
                  title="Tamanho padrão de fonte (A)"
                >
                  A
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 h-7 text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    fontScale > 1.0 ? "text-[#38BDF8] bg-white/10" : "text-[#94A3B8] hover:text-white"
                  }`}
                  onClick={() => setFontScale((s) => Math.min(1.30, Number((s + 0.1).toFixed(2))))}
                  title="Aumentar tamanho da fonte (A+)"
                >
                  A+
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Session & Device Status Card */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            {/* Card de Usuário Autenticado */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#080C14] border border-white/5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-[#0284C7]/20 border border-[#0284C7]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-white leading-tight truncate">
                    {usuario.username}
                  </p>
                  <span className="text-[10px] font-mono text-[#10B981] capitalize">
                    {usuario.role === "admin" ? "Administrador" : usuario.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sair do Sistema"
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Indicador de Conexão IoT */}
            <div className="rounded-xl border border-white/5 bg-[#080C14] p-2.5 space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-glow-safe" />
                  <span className="text-xs font-semibold text-white">Nó Sensor IoT</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">ESP32</span>
              </div>
              <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
                <span className="flex items-center gap-1 font-mono">
                  <Cpu className="h-3 w-3 text-[#38BDF8]" /> DHT22
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Wifi className="h-3 w-3 text-[#10B981]" /> HTTP POST
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] border-t border-white/5 pt-1 truncate">
                Último pacote: <strong className="text-[#94A3B8] font-mono">{ultima ? ultima.timestamp.slice(11, 19) : "--:--:--"}</strong>
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-between max-w-7xl mx-auto w-full">
          <div>
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden p-2 rounded-lg border border-white/10 text-[#94A3B8] hover:text-white"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Casa Cuida · Monitor do Guarda-Roupa
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Online
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
                    {todosNavItems.find((n) => n.id === pagina)?.label}
                  </h1>
                </div>
              </div>

              {/* Status Pill Badge */}
              <div className="flex items-center gap-2">
                {classeRisco === 2 ? (
                  <Badge variant="destructive" className="py-1.5 px-3.5 text-xs gap-2 animate-glow-danger font-semibold">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                    {rotuloRisco}
                  </Badge>
                ) : classeRisco === 1 ? (
                  <Badge variant="warning" className="py-1.5 px-3.5 text-xs gap-2 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    {rotuloRisco}
                  </Badge>
                ) : (
                  <Badge variant="success" className="py-1.5 px-3.5 text-xs gap-2 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    {rotuloRisco}
                  </Badge>
                )}
              </div>
            </div>

            {/* Dynamic View Component com transição animada fluida */}
            <div key={pagina} className="animate-fade-in">
              {pagina === "visao_geral" && <VisaoGeral leituras={leituras} />}
              {pagina === "metricas" && <MetricasGraficos leituras={leituras} />}
              {pagina === "laboratorio_ia" && <LaboratorioIA />}
              {pagina === "tabela_telemetria" && <TabelaTelemetria leituras={leituras} />}
              {pagina === "dossie_academico" && <DossieAcademico />}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-[#64748B]">
            <p className="font-semibold text-[#38BDF8] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Casa Cuida</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
