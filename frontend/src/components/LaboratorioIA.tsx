import { useState, useEffect, useCallback } from "react"
import { Brain, AlertTriangle, CheckCircle2, Droplets, Thermometer } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { simularCenario } from "@/lib/api"
import type { SimulacaoResponse } from "@/types"

export function LaboratorioIA() {
  const [temperatura, setTemperatura] = useState<number>(24.0)
  const [umidade, setUmidade] = useState<number>(80.0)
  const [resultado, setResultado] = useState<SimulacaoResponse | null>(null)

  const executarSimulacao = useCallback(async (t: number, u: number) => {
    try {
      const res = await simularCenario(t, u)
      setResultado(res)
    } catch (err) {
      console.error("Erro na simulação:", err)
    }
  }, [])

  useEffect(() => {
    executarSimulacao(temperatura, umidade)
  }, [temperatura, umidade, executarSimulacao])

  const aplicarCenario = (t: number, u: number) => {
    setTemperatura(t)
    setUmidade(u)
  }

  const diag = resultado?.diagnostico_ia
  const fisica = resultado?.fisica_psicrometrica
  const classe = diag?.classe_risco ?? 0

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#38BDF8]" />
                Simulador de Microclima & Diagnóstico Preditivo
              </CardTitle>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Ajuste os seletores abaixo ou escolha um cenário pré-definido para testar o modelo Random Forest em tempo real.
              </p>
            </div>
            {/* Presets de Demonstração */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                onClick={() => aplicarCenario(23.0, 52.0)}
              >
                Dia Normal (23°C / 52%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                onClick={() => aplicarCenario(24.0, 85.0)}
              >
                Chuva / Mofo (24°C / 85%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                onClick={() => aplicarCenario(27.0, 26.0)}
              >
                Ar Seco (27°C / 26%)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sliders de Temperatura e Umidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-xl bg-[#080C14] border border-white/5">
            {/* Temperatura */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5" /> Temperatura Simulada
                </span>
                <span className="text-sm font-extrabold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {temperatura.toFixed(1)} °C
                </span>
              </div>
              <Slider
                min={10}
                max={42}
                step={0.5}
                value={[temperatura]}
                onValueChange={(val) => setTemperatura(val[0])}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                <span>10 °C</span>
                <span>Conforto (20 - 25 °C)</span>
                <span>42 °C</span>
              </div>
            </div>

            {/* Umidade */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" /> Umidade Relativa Simulada
                </span>
                <span className="text-sm font-extrabold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {umidade.toFixed(0)} %
                </span>
              </div>
              <Slider
                min={15}
                max={98}
                step={1}
                value={[umidade]}
                onValueChange={(val) => setUmidade(val[0])}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                <span>15% (Seco)</span>
                <span>Ideal (45 - 60%)</span>
                <span>98% (Saturação)</span>
              </div>
            </div>
          </div>

          {/* Resultado da IA */}
          {diag && (
            <div className="space-y-4 animate-scale-up">
              <Alert
                variant={classe === 2 ? "destructive" : classe === 1 ? "warning" : "success"}
                className={classe === 2 ? "animate-glow-danger" : ""}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {classe === 2 ? (
                      <AlertTriangle className="h-5 w-5 text-rose-400" />
                    ) : classe === 1 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    )}
                    <AlertTitle className="text-sm font-extrabold m-0">
                      Diagnóstico: {diag.rotulo}
                    </AlertTitle>
                  </div>
                  <Badge variant={classe === 2 ? "destructive" : classe === 1 ? "warning" : "success"} className="font-mono">
                    {diag.probabilidade} confiança
                  </Badge>
                </div>
                <AlertDescription className="mt-2 text-xs font-medium">
                  {diag.recomendacao}
                </AlertDescription>
              </Alert>

              {/* Fundamentação Física Psicrométrica */}
              {fisica && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/5 bg-[#080C14] p-3.5">
                    <span className="text-[0.7rem] font-bold text-[#94A3B8] uppercase tracking-wider">
                      Ponto de Orvalho Calculado
                    </span>
                    <div className="text-xl font-black text-white mt-1 font-mono">
                      {fisica.ponto_orvalho.toFixed(1)} °C
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Fórmula de Magnus-Tetens
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-[#080C14] p-3.5">
                    <span className="text-[0.7rem] font-bold text-[#94A3B8] uppercase tracking-wider">
                      Folga até Condensação
                    </span>
                    <div
                      className={`text-xl font-black mt-1 font-mono ${
                        fisica.delta_orvalho <= 3.5 ? "text-rose-400" : "text-[#38BDF8]"
                      }`}
                    >
                      {fisica.delta_orvalho.toFixed(1)} °C
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {fisica.delta_orvalho <= 3.5
                        ? "Risco iminente de suor nas paredes"
                        : "Margem segura de aeração"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-[#080C14] p-3.5">
                    <span className="text-[0.7rem] font-bold text-[#94A3B8] uppercase tracking-wider">
                      Déficit de Pressão (VPD)
                    </span>
                    <div className="text-xl font-black text-white mt-1 font-mono">
                      {fisica.vpd_kpa.toFixed(2)} kPa
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Pressão de evaporação do ambiente
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
