import { useMemo } from "react"
import {
  Thermometer,
  Droplets,
  Wind,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Shirt,
  Clock,
  ShieldCheck,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Leitura } from "@/types"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

interface VisaoGeralProps {
  leituras: Leitura[]
}

const chartConfig = {
  temperatura: {
    label: "Temperatura (°C)",
    color: "#FBBF24",
    icon: Thermometer,
  },
  umidade: {
    label: "Umidade Relativa (%)",
    color: "#34D399",
    icon: Droplets,
  },
} satisfies ChartConfig

export function VisaoGeral({ leituras }: VisaoGeralProps) {
  const ultima = leituras[leituras.length - 1] || {
    temperatura: 23.5,
    umidade: 52.0,
    ponto_orvalho: 13.0,
    vpd: 1.2,
    risco_classe: 0,
    risco_rotulo: "Ambiente Seguro",
    probabilidade: 96,
    recomendacao: "Ambiente ideal para conservação de roupas e sono reparador.",
  }

  const classe = ultima.risco_classe ?? 0
  const prob = ultima.probabilidade ?? 95
  const folga = Number((ultima.temperatura - ultima.ponto_orvalho).toFixed(1))

  // Score de qualidade do ar (0 a 100)
  const scoreAr = useMemo(() => {
    if (classe === 2) return Math.max(15, Math.round(100 - prob))
    if (classe === 1) return 55
    return Math.round(prob)
  }, [classe, prob])

  // Formatação dos dados para o gráfico de área shadcn
  const chartData = useMemo(() => {
    const recentes = leituras.slice(-35)
    return recentes.map((l) => ({
      time: l.timestamp ? l.timestamp.split(" ")[1]?.slice(0, 5) || l.timestamp : "",
      temperatura: l.temperatura,
      umidade: l.umidade,
    }))
  }, [leituras])

  // Cálculo de leituras consecutivas na zona de mofo (>= 70% RH)
  const leiturasConsecutivasRisco = useMemo(() => {
    let count = 0
    for (let i = leituras.length - 1; i >= 0; i--) {
      if (leituras[i].umidade >= 70) {
        count++
      } else {
        break
      }
    }
    return count
  }, [leituras])

  // Estimativa de tempo contínuo de exposição crítica (em horas)
  const horasCriticas = useMemo(() => {
    if (leiturasConsecutivasRisco === 0) return 0
    return Number((leiturasConsecutivasRisco * 0.25).toFixed(1))
  }, [leiturasConsecutivasRisco])

  // Diagnóstico de preservação dos tecidos e calçados
  const statusVestuario = useMemo(() => {
    const umid = ultima.umidade
    if (umid >= 70) {
      return {
        couro: { status: "Risco Alto de Bolor", nivel: "danger", desc: "Couro e calçados absorvem umidade rapidamente; risco de mofo branco em 48h." },
        tecidos: { status: "Proliferação de Ácaros", nivel: "danger", desc: "Casacos de lã e cobertores propensos a cheiro de guardado e fungos." },
        antimofo: { status: "Saturação Iminente", nivel: "warning", desc: "Verifique o nível de água no pote anti-mofo ou substitua sachês de sílica." }
      }
    }
    if (umid < 35) {
      return {
        couro: { status: "Risco de Ressecamento", nivel: "warning", desc: "Ar muito seco pode causar microfissuras e perda de flexibilidade no couro." },
        tecidos: { status: "Estático / Poeira", nivel: "safe", desc: "Fibras sem risco de bolor, porém maior acúmulo de partículas em suspensão." },
        antimofo: { status: "Inativo / Preservado", nivel: "safe", desc: "Sílica gel com longa durabilidade neste período seco." }
      }
    }
    return {
      couro: { status: "Preservação Ideal", nivel: "safe", desc: "Condição térmica e higrométrica perfeita para sapatos, bolsas e jaquetas." },
      tecidos: { status: "Fibras Protegidas", nivel: "safe", desc: "Tecidos de algodão e lã livres de proliferação biológica." },
      antimofo: { status: "Ação Regular", nivel: "safe", desc: "Absorção de umidade em níveis normais de conservação." }
    }
  }, [ultima.umidade])

  return (
    <div className="space-y-5">
      {/* 4 KPI Cards Grid com Stagger e Hover Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperatura */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 transition-all duration-200 animate-fade-in stagger-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
              Temperatura
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Thermometer className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {ultima.temperatura.toFixed(1)}
              <span className="text-sm font-normal text-[#94A3B8] ml-1">°C</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2 border-t border-white/5 pt-2">
              Faixa ideal: 20 °C a 25 °C
            </p>
          </CardContent>
        </Card>

        {/* Umidade Relativa */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 transition-all duration-200 animate-fade-in stagger-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
              Umidade Relativa
            </CardTitle>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                ultima.umidade >= 70
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : ultima.umidade < 35
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <Droplets className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-extrabold tracking-tight font-mono ${
                ultima.umidade >= 70
                  ? "text-rose-400"
                  : ultima.umidade < 35
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {ultima.umidade.toFixed(1)}
              <span className="text-sm font-normal text-[#94A3B8] ml-1">%</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2 border-t border-white/5 pt-2">
              Limiar crítico: &gt; 70% RH
            </p>
          </CardContent>
        </Card>

        {/* Ponto de Orvalho */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 transition-all duration-200 animate-fade-in stagger-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
              Ponto de Orvalho
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wind className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {ultima.ponto_orvalho.toFixed(1)}
              <span className="text-sm font-normal text-[#94A3B8] ml-1">°C</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2 border-t border-white/5 pt-2">
              Folga térmica:{" "}
              <strong className={folga <= 3.5 ? "text-rose-400" : "text-sky-400"}>
                {folga} °C
              </strong>{" "}
              até condensar
            </p>
          </CardContent>
        </Card>

        {/* Diagnóstico da IA */}
        <Card
          className={`bg-[#0F172A] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 animate-fade-in stagger-4 ${
            classe === 2
              ? "border-rose-500/50 bg-rose-950/20 animate-glow-danger"
              : classe === 1
              ? "border-amber-500/40"
              : "border-emerald-500/30"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
              Diagnóstico IA
            </CardTitle>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                classe === 2
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                  : classe === 1
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              }`}
            >
              <Brain className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-lg font-bold tracking-tight truncate leading-tight ${
                classe === 2
                  ? "text-rose-400"
                  : classe === 1
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {ultima.risco_rotulo}
            </div>
            <p className="text-xs text-[#64748B] mt-2 border-t border-white/5 pt-2">
              Confiança: <strong className="text-slate-300 font-mono">{prob.toFixed(0)}%</strong> (Random Forest)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Central: Gráfico shadcn Area Chart + Diagnóstico Familiar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Curva Microclimática Recente (2 colunas) */}
        <Card className="lg:col-span-2 bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200 animate-slide-up stagger-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">
                  Curva Microclimática Recente
                </CardTitle>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Oscilação de temperatura e umidade em tempo real (Polo Boituva-SP)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[270px] w-full aspect-auto">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillTemperatura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-temperatura)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-temperatura)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillUmidade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-umidade)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-umidade)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} domain={[10, 100]} />
                <ReferenceLine y={70} stroke="#FB7185" strokeDasharray="3 3" label={{ value: "Risco Mofo (>70%)", fill: "#FB7185", fontSize: 10 }} />
                <ReferenceLine y={35} stroke="#FBBF24" strokeDasharray="3 3" label={{ value: "Ar Seco (<35%)", fill: "#FBBF24", fontSize: 10 }} />
                <ChartTooltip
                  cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="umidade"
                  type="natural"
                  fill="url(#fillUmidade)"
                  fillOpacity={0.4}
                  stroke="var(--color-umidade)"
                  strokeWidth={2}
                  stackId="a"
                />
                <Area
                  dataKey="temperatura"
                  type="natural"
                  fill="url(#fillTemperatura)"
                  fillOpacity={0.4}
                  stroke="var(--color-temperatura)"
                  strokeWidth={2}
                  stackId="b"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Diagnóstico Familiar & Score de Saúde */}
        <Card className="flex flex-col justify-between bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200 animate-slide-up stagger-4">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Diagnóstico Ambiental
            </CardTitle>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Índice consolidado de qualidade do ar residencial
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Box */}
            <div className="rounded-xl bg-[#080C14] border border-white/5 p-5 text-center relative overflow-hidden">
              <span className="text-[0.7rem] font-bold text-[#64748B] uppercase tracking-wider block">
                Score de Saúde do Ar
              </span>
              <div
                className={`text-5xl font-black my-2 tracking-tight font-mono ${
                  scoreAr >= 70
                    ? "text-emerald-400"
                    : scoreAr >= 40
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {scoreAr}
                <span className="text-base font-normal text-[#64748B]">/100</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                {classe === 2 ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" /> {ultima.risco_rotulo}
                  </Badge>
                ) : classe === 1 ? (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3" /> {ultima.risco_rotulo}
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" /> {ultima.risco_rotulo}
                  </Badge>
                )}
              </div>
            </div>

            {/* Prescrição Preventiva */}
            <Alert variant={classe === 2 ? "destructive" : classe === 1 ? "warning" : "info"}>
              <AlertTitle className="text-xs uppercase font-bold tracking-wider">
                Ação Preventiva para o Guarda-Roupa
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                {ultima.recomendacao}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Seção Customizada: Preservação do Guarda-Roupa & Risco Fúngico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in stagger-4">
        {/* Card 1: Exposição ao Risco de Mofo */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#38BDF8]" />
                Tempo Contínuo em Risco
              </CardTitle>
              <Badge
                variant={horasCriticas > 0 ? "destructive" : "success"}
                className="text-[10px]"
              >
                {horasCriticas > 0 ? "Zona de Risco" : "Zona Segura"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-black font-mono text-white">
              {horasCriticas > 0 ? `${horasCriticas}h` : "0h"}
              <span className="text-xs font-normal text-[#94A3B8] ml-2">
                {horasCriticas > 0 ? "em umidade > 70%" : "sem risco acumulado"}
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              {horasCriticas >= 24
                ? "Atenção máxima: o limiar de 24h para germinação de esporos fúngicos foi atingido!"
                : horasCriticas > 0
                ? "Fungos levam de 24h a 48h ininterruptas acima de 70% RH para germinar nos tecidos."
                : "Ambiente do armário estável e sem histórico recente de saturação fúngica."}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Couro & Calçados */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Couro & Calçados
              </CardTitle>
              <Badge
                variant={
                  statusVestuario.couro.nivel === "danger"
                    ? "destructive"
                    : statusVestuario.couro.nivel === "warning"
                    ? "warning"
                    : "success"
                }
                className="text-[10px]"
              >
                {statusVestuario.couro.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#94A3B8] mt-1">
              {statusVestuario.couro.desc}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Roupas & Anti-Mofo */}
        <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Shirt className="h-4 w-4 text-emerald-400" />
                Vestuário & Anti-Mofo
              </CardTitle>
              <Badge
                variant={
                  statusVestuario.tecidos.nivel === "danger"
                    ? "destructive"
                    : "success"
                }
                className="text-[10px]"
              >
                {statusVestuario.tecidos.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#94A3B8] mt-1">
              {statusVestuario.tecidos.desc}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
