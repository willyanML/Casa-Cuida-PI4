import { useMemo } from "react"
import {
  Thermometer,
  Droplets,
  Wind,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Shirt,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Sun,
  Layers,
  Sparkles,
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
    const recentes = leituras.slice(-150)
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

  // Simulação física de resfriamento noturno (queda de temperatura na madrugada com mesma umidade absoluta)
  const simulacaoNoturna = useMemo(() => {
    const t = ultima.temperatura
    const rh = ultima.umidade
    const td = ultima.ponto_orvalho

    // Pressão de vapor real atual
    const vpSatAtual = 0.61078 * Math.exp((17.27 * t) / (t + 237.3))
    const vpReal = vpSatAtual * (rh / 100.0)

    return [2.0, 3.0, 4.0].map((queda) => {
      const tempPrevista = Number((t - queda).toFixed(1))
      const vpSatSim = 0.61078 * Math.exp((17.27 * tempPrevista) / (tempPrevista + 237.3))
      const urPrevista = Number(Math.min(100.0, (vpReal / vpSatSim) * 100.0).toFixed(1))
      const condensa = tempPrevista <= td || urPrevista >= 99.0
      const folgaRestante = Number((tempPrevista - td).toFixed(1))

      let status = "Microclima Estável"
      let nivel: "safe" | "warning" | "danger" = "safe"

      if (condensa) {
        status = "Condensação Iminente"
        nivel = "danger"
      } else if (urPrevista >= 75.0 || folgaRestante <= 2.0) {
        status = "Alto Risco de Bolor"
        nivel = "warning"
      }

      return {
        queda,
        tempPrevista,
        urPrevista,
        condensa,
        folgaRestante,
        status,
        nivel
      }
    })
  }, [ultima.temperatura, ultima.umidade, ultima.ponto_orvalho])

  // Diagnóstico aprofundado por tipo de material segundo normas da EPA, OMS, ASHRAE e Smithsonian
  const diagnosticoMateriais = useMemo(() => {
    const rh = ultima.umidade
    type NivelMaterial = "safe" | "warning" | "danger"
    interface ItemMaterial {
      titulo: string
      nivel: NivelMaterial
      faixa: string
      explicacao: string
      acao: string
    }

    // 1. Couro e Calçados (Smithsonian e Canadian Conservation Institute: ideal 45% a 65%)
    let couro: ItemMaterial = {
      titulo: "Preservação Ideal",
      nivel: "safe",
      faixa: "45% a 65% UR",
      explicacao: "Equilíbrio higrométrico perfeito para calçados, bolsas e jaquetas conforme normas de conservação de museus.",
      acao: "Mantenha o armário organizado e limpo. Sem necessidade de intervenção."
    }
    if (rh >= 70.0) {
      couro = {
        titulo: "Risco Crítico de Fungos",
        nivel: "danger",
        faixa: "45% a 65% UR",
        explicacao: "O couro é rico em colágeno e óleos naturais que alimentam esporos fúngicos com umidade acima de 65%.",
        acao: "Tire sapatos de caixas plásticas fechadas, limpe com flanela seca e use sachê de sílica gel."
      }
    } else if (rh > 65.0) {
      couro = {
        titulo: "Atenção: Umidade Elevada",
        nivel: "warning",
        faixa: "45% a 65% UR",
        explicacao: "Limiar inicial de absorção fúngica em artigos de couro legítimo e camurça.",
        acao: "Areje a sapateira e verifique se há calçados guardados no fundo do móvel."
      }
    } else if (rh < 40.0) {
      couro = {
        titulo: "Risco de Ressecamento",
        nivel: "warning",
        faixa: "45% a 65% UR",
        explicacao: "Ar muito seco desidrata o couro, provocando rigidez, perda de flexibilidade e microfissuras.",
        acao: "Evite correntes de calor direto e considere hidratante de couro legítimo se o tempo seco persistir."
      }
    }

    // 2. Roupas e Fibras Têxteis (EPA e OMS: ideal 30% a 60%)
    let tecidos: ItemMaterial = {
      titulo: "Fibras Têxteis Protegidas",
      nivel: "safe",
      faixa: "30% a 60% UR",
      explicacao: "Ambiente sem vapor retido nos tecidos; ácaros e fungos inibidos segundo padrões EPA.",
      acao: "Condição estável. Roupas de algodão, linho e lã preservadas."
    }
    if (rh >= 70.0) {
      tecidos = {
        titulo: "Risco de Bolor e Ácaros",
        nivel: "danger",
        faixa: "30% a 60% UR",
        explicacao: "Fibras de algodão e lã retêm umidade estagnada, gerando cheiro de guardado e esporos em 48h.",
        acao: "Areje casacos em local ventilado e não guarde roupas com qualquer resquício de suor ou umidade."
      }
    } else if (rh > 60.0) {
      tecidos = {
        titulo: "Retenção Residual de Vapor",
        nivel: "warning",
        faixa: "30% a 60% UR",
        explicacao: "Acima de 60% (teto recomendado pela EPA) as fibras têxteis começam a acumular vapor confinado.",
        acao: "Abra as portas do móvel por 30 a 40 minutos em horários ensolarados para renovação do ar."
      }
    }

    // 3. Fundo do Armário e Madeira (ASHRAE 160: Folga Térmica > 3.5 °C e UR < 65%)
    let madeira: ItemMaterial = {
      titulo: "Estrutura e Gavetas Secas",
      nivel: "safe",
      faixa: "Folga > 3.5 °C e UR < 65%",
      explicacao: "Margem de isolamento térmico segura contra a parede fria. Sem condensação intersticial.",
      acao: "Espaçamento e circulação de ar adequados."
    }
    if (folga <= 2.5 || rh >= 75.0) {
      madeira = {
        titulo: "Alerta: Condensação na Madeira",
        nivel: "danger",
        faixa: "Folga > 3.5 °C e UR < 65%",
        explicacao: "A parede fria no fundo do armário pode estar abaixo do ponto de orvalho, estufando MDF e aglomerado.",
        acao: "Afaste o guarda-roupa 5 cm da parede fria externa e coloque pote desumidificador no piso do móvel."
      }
    } else if (folga <= 4.0 || rh >= 65.0) {
      madeira = {
        titulo: "Atenção: Queda Noturna Perigosa",
        nivel: "warning",
        faixa: "Folga > 3.5 °C e UR < 65%",
        explicacao: "O resfriamento na madrugada pode zerar a folga térmica onde o móvel encosta na alvenaria.",
        acao: "Monitore se o fundo do guarda-roupa está frio ou úmido ao toque pelas manhãs."
      }
    }

    return { couro, tecidos, madeira }
  }, [ultima.umidade, folga])

  // Guia de ação prática para o morador da residência
  const guiaAcao = useMemo(() => {
    const rh = ultima.umidade
    const f = folga

    if (rh >= 70.0 || f <= 2.5) {
      return {
        arejamento: "Abra as portas do guarda-roupa entre 11h e 15h por 45 minutos em dias ensolarados. Mantenha portas totalmente fechadas à noite ou durante chuvas externas para não deixar entrar ar saturado.",
        desumidificador: "Ação imediata: coloque pote desumidificador (cloreto de cálcio) ou sachês de sílica na base do móvel e sapateira. Verifique se o pote atual já acumulou água no fundo e substitua se estiver cheio.",
        prioridade: "alta"
      }
    }
    if (rh >= 60.0 || f <= 4.0) {
      return {
        arejamento: "Ventile o armário por 30 minutos em horário quente e seco do dia (início da tarde) para renovar o ar estagnado.",
        desumidificador: "Recomendado posicionar sachês de sílica gel nas prateleiras de calçados e gavetas de roupas íntimas para manter o microclima controlado.",
        prioridade: "media"
      }
    }
    if (rh < 40.0) {
      return {
        arejamento: "Mantenha as portas fechadas para reter a umidade natural do couro e calçados durante períodos muito secos.",
        desumidificador: "Desumidificadores podem ser temporariamente vedados para não reduzir ainda mais a hidratação das peças de couro legítimo.",
        prioridade: "baixa"
      }
    }
    return {
      arejamento: "Arejamento de rotina: abra as portas por 20 minutos 2 a 3 vezes por semana para circulação e renovação do ar.",
      desumidificador: "Condição excelente. Antimofos ou sachês operando em regime de conservação preventiva normal.",
      prioridade: "normal"
    }
  }, [ultima.umidade, folga])

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
                  Oscilação de temperatura e umidade em tempo real (Guarda-Roupa)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[270px] w-full aspect-auto">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillTemperatura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-temperatura, #FBBF24)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-temperatura, #FBBF24)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillUmidade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-umidade, #34D399)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-umidade, #34D399)" stopOpacity={0.02} />
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
                  stroke="var(--color-umidade, #34D399)"
                  strokeWidth={2}
                  stackId="a"
                  isAnimationActive={false}
                />
                <Area
                  dataKey="temperatura"
                  type="natural"
                  fill="url(#fillTemperatura)"
                  fillOpacity={0.4}
                  stroke="var(--color-temperatura, #FBBF24)"
                  strokeWidth={2}
                  stackId="b"
                  isAnimationActive={false}
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

      {/* Central de Prevenção Inteligente do Guarda-Roupa */}
      <div id="central-prevencao" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#38BDF8]" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Central de Prevenção Inteligente
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Cálculos físicos psicrométricos e normas de conservação predial (ASHRAE 160, EPA e Smithsonian)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
              Monitoramento Ativo
            </span>
            <Badge variant="outline" className="text-xs font-mono border-[#38BDF8]/30 text-[#38BDF8]">
              {horasCriticas > 0 ? `${horasCriticas}h em risco` : "Sem mofo acumulado"}
            </Badge>
          </div>
        </div>

        {/* Linha 1: Folga Térmica + Simulação de Queda Noturna */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Folga Térmica até o Ponto de Orvalho */}
          <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <Wind className="h-4 w-4 text-indigo-400" />
                  Folga Térmica até o Ponto de Orvalho
                </CardTitle>
                <Badge
                  variant={folga <= 2.5 ? "destructive" : folga <= 4.0 ? "warning" : "success"}
                  className="text-[10px]"
                >
                  {folga <= 2.5 ? "Condensação Iminente" : folga <= 4.0 ? "Atenção Crítica" : "Margem Segura"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono text-white">
                    {folga}
                  </span>
                  <span className="text-sm font-normal text-[#94A3B8] ml-1">°C de folga</span>
                </div>
                <div className="text-right text-xs text-[#94A3B8]">
                  Ponto de Orvalho: <strong className="text-white font-mono">{ultima.ponto_orvalho.toFixed(1)} °C</strong>
                </div>
              </div>

              {/* Barra visual de margem de condensação */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-[#080C14] rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      folga <= 2.5
                        ? "bg-rose-500"
                        : folga <= 4.0
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, (folga / 8.0) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>0 °C (Orvalho)</span>
                  <span>4 °C (Segurança)</span>
                  <span>&gt; 8 °C (Ideal)</span>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] bg-[#080C14] p-2.5 rounded-lg border border-white/5 leading-relaxed">
                {folga <= 2.5
                  ? "Risco severo: a temperatura ambiente está a menos de 2.5 °C de saturar o ar. Qualquer superfície fria (como a parede de fundo do armário) já pode estar condensando água líquida."
                  : folga <= 4.0
                  ? "Atenção: uma queda noturna comum de 3 °C a 4 °C durante a madrugada fará o vapor de água atingir 100% de umidade relativa no interior do móvel."
                  : "Margem térmica segura: o ar do armário suporta uma queda natural de temperatura de mais de 4 °C sem que ocorra condensação nas roupas ou paredes."}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Simulação de Condensação Noturna (Madrugada) */}
          <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <Moon className="h-4 w-4 text-sky-400" />
                  Previsão de Queda Noturna (Madrugada)
                </CardTitle>
                <span className="text-[10px] text-[#64748B]">
                  Simulação Psicrométrica
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {simulacaoNoturna.map((sim) => (
                  <div
                    key={sim.queda}
                    className={`rounded-lg p-2.5 border text-center space-y-1 transition-all ${
                      sim.condensa
                        ? "bg-rose-950/20 border-rose-500/40"
                        : sim.nivel === "warning"
                        ? "bg-amber-950/20 border-amber-500/40"
                        : "bg-[#080C14] border-white/5"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-[#94A3B8]">
                      Queda de {sim.queda} °C
                    </div>
                    <div className="text-sm font-black font-mono text-white">
                      {sim.tempPrevista} °C
                    </div>
                    <div className="text-[11px] font-mono text-[#38BDF8]">
                      {sim.urPrevista}% UR
                    </div>
                    <Badge
                      variant={sim.condensa ? "destructive" : sim.nivel === "warning" ? "warning" : "success"}
                      className="text-[9px] px-1 py-0"
                    >
                      {sim.condensa ? "Condensa" : sim.nivel === "warning" ? "Risco Mofo" : "Seguro"}
                    </Badge>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#94A3B8] bg-[#080C14] p-2.5 rounded-lg border border-white/5 leading-relaxed">
                {simulacaoNoturna.some((s) => s.condensa)
                  ? "Alerta de resfriamento: a queda normal de temperatura na madrugada atingirá o ponto de orvalho, provocando gotículas na madeira e nas roupas caso o guarda-roupa permaneça sem desumidificador."
                  : "Estabilidade térmica: mesmo com queda de até 4 °C na madrugada fria, a umidade relativa estimada não atinge a saturação líquida."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Linha 2: Matriz por Material + Guia Prático de Ação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 3: Matriz de Proteção por Material */}
          <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Preservação por Tipo de Material
                </CardTitle>
                <span className="text-[10px] text-[#64748B]">
                  Smithsonian &bull; EPA &bull; ASHRAE
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Couro & Calçados */}
              <div className="rounded-lg p-2.5 bg-[#080C14] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    Calçados, Bolsas & Jaquetas de Couro
                  </span>
                  <Badge
                    variant={diagnosticoMateriais.couro.nivel === "danger" ? "destructive" : diagnosticoMateriais.couro.nivel === "warning" ? "warning" : "success"}
                    className="text-[10px]"
                  >
                    {diagnosticoMateriais.couro.titulo}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  {diagnosticoMateriais.couro.explicacao}
                </p>
                <p className="text-[11px] text-[#38BDF8] font-medium pt-0.5">
                  &bull; Ação: {diagnosticoMateriais.couro.acao}
                </p>
              </div>

              {/* Roupas & Fibras Naturais */}
              <div className="rounded-lg p-2.5 bg-[#080C14] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shirt className="h-3.5 w-3.5 text-emerald-400" />
                    Roupas de Algodão, Lã & Cobertores
                  </span>
                  <Badge
                    variant={diagnosticoMateriais.tecidos.nivel === "danger" ? "destructive" : diagnosticoMateriais.tecidos.nivel === "warning" ? "warning" : "success"}
                    className="text-[10px]"
                  >
                    {diagnosticoMateriais.tecidos.titulo}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  {diagnosticoMateriais.tecidos.explicacao}
                </p>
                <p className="text-[11px] text-[#38BDF8] font-medium pt-0.5">
                  &bull; Ação: {diagnosticoMateriais.tecidos.acao}
                </p>
              </div>

              {/* Estrutura & Fundo do Guarda-Roupa */}
              <div className="rounded-lg p-2.5 bg-[#080C14] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
                    Fundo de Madeira, MDF & Gavetas
                  </span>
                  <Badge
                    variant={diagnosticoMateriais.madeira.nivel === "danger" ? "destructive" : diagnosticoMateriais.madeira.nivel === "warning" ? "warning" : "success"}
                    className="text-[10px]"
                  >
                    {diagnosticoMateriais.madeira.titulo}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  {diagnosticoMateriais.madeira.explicacao}
                </p>
                <p className="text-[11px] text-[#38BDF8] font-medium pt-0.5">
                  &bull; Ação: {diagnosticoMateriais.madeira.acao}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Guia Prático de Ação Residencial */}
          <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Guia Prático de Ação Residencial
                </CardTitle>
                <Badge
                  variant={guiaAcao.prioridade === "alta" ? "destructive" : guiaAcao.prioridade === "media" ? "warning" : "success"}
                  className="text-[10px]"
                >
                  Prioridade {guiaAcao.prioridade.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Arejamento Inteligente */}
              <div className="rounded-lg p-3 bg-[#080C14] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sun className="h-4 w-4 text-amber-400" />
                  Janela Ideal de Arejamento
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {guiaAcao.arejamento}
                </p>
              </div>

              {/* Desumidificação & Sílica */}
              <div className="rounded-lg p-3 bg-[#080C14] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Droplets className="h-4 w-4 text-[#38BDF8]" />
                  Controle de Desumidificação
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {guiaAcao.desumidificador}
                </p>
              </div>

              {/* Resumo de Tempo Crítico */}
              <div className="text-[11px] text-[#64748B] border-t border-white/5 pt-2 flex items-center justify-between">
                <span>Janela crítica biológica (OMS):</span>
                <strong className={horasCriticas >= 24 ? "text-rose-400" : "text-slate-300"}>
                  {horasCriticas > 0 ? `${horasCriticas}h / 48h limite` : "0h de exposição contínua"}
                </strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
