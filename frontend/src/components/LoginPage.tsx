import React, { useState, useEffect } from "react"
import { Home, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loginApi, fetchStatus } from "@/lib/api"
import type { Usuario } from "@/types"

interface LoginPageProps {
  onLoginSuccess: (usuario: Usuario) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  // Checa se a API já respondeu (importante para o cold start gratuito do Render)
  useEffect(() => {
    let montado = true
    const verificar = async () => {
      try {
        await fetchStatus()
        if (montado) setApiOnline(true)
      } catch {
        if (montado) setApiOnline(false)
      }
    }
    verificar()
    const timer = setInterval(verificar, 8000)
    return () => {
      montado = false
      clearInterval(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setErrorMsg("Preencha usuário e senha.")
      return
    }

    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await loginApi(username, password)
      onLoginSuccess(res.usuario)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg("Erro desconhecido ao autenticar.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080C14] text-[#F8FAFC] relative overflow-hidden select-none">
      {/* Luz ambiente de fundo (Ambient Glow) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#0284C7]/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Card Principal de Login */}
      <div className="w-full max-w-md bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-7 md:p-9 shadow-2xl relative z-10 animate-pop-in">
        {/* Status de Nuvem / Servidor */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                apiOnline === true
                  ? "bg-[#10B981] animate-glow-safe"
                  : apiOnline === false
                  ? "bg-[#F59E0B] animate-pulse"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-xs font-mono text-[#94A3B8]">
              {apiOnline === true
                ? "API Online · Boituva-SP"
                : apiOnline === false
                ? "Conectando ao Servidor..."
                : "Verificando Status..."}
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#94A3B8] border border-white/5">
            PI4 UNIVESP
          </span>
        </div>

        {/* Identidade do Projeto */}
        <div className="mt-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0284C7]/20 to-[#0F172A] border border-[#0284C7]/40 shadow-inner text-[#38BDF8] mb-1">
            <Home className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Casa Cuida</h1>
          <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs mx-auto">
            Sistema de Telemetria IoT e Inteligência Artificial para Prevenção Microclimática de Mofo
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#FB7185] rounded-lg animate-fade-in flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Campo Usuário */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-[#94A3B8] block">
              Usuário
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário..."
                className="w-full bg-[#080C14] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all duration-150"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-[#94A3B8] block">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
                className="w-full bg-[#080C14] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC] p-1 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Submissão */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-medium text-sm rounded-lg shadow-lg shadow-[#0284C7]/25 flex items-center justify-center gap-2 transition-all duration-150 hover:-translate-y-0.5 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar Painel Telemétrico</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Rodapé Acadêmico */}
      <div className="absolute bottom-4 text-center text-xs text-[#64748B]">
        Universidade Virtual do Estado de São Paulo · Polo Boituva-SP
      </div>
    </div>
  )
}
