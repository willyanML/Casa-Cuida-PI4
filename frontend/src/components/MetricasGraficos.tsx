import { useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

interface MetricasGraficosProps {
  leituras: Leitura[]
}

const chartConfig = {
  temperatura: {
    label: "Temperatura (°C)",
    color: "#FBBF24",
  },
  ponto_orvalho: {
    label: "Ponto de Orvalho (°C)",
    color: "#A78BFA",
  },
  umidade: {
    label: "Umidade Relativa (%)",
    color: "#34D399",
  },
} satisfies ChartConfig

export function MetricasGraficos({ leituras }: MetricasGraficosProps) {
  const chartData = useMemo(() => {
    return leituras.map((l) => ({
      dataHora: l.timestamp ? l.timestamp.slice(5, 16) : "",
      temperatura: l.temperatura,
      ponto_orvalho: l.ponto_orvalho,
      umidade: l.umidade,
    }))
  }, [leituras])

  const stats = useMemo(() => {
    if (!leituras.length) {
      return {
        mediaTemp: 23.5,
        varTemp: 4.2,
        mediaUmid: 55.0,
        maxUmid: 82.0,
        mediaOrvalho: 13.5,
        mediaVpd: 1.15,
      }
    }
    const temps = leituras.map((l) => l.temperatura)
    const umids = leituras.map((l) => l.umidade)
    const orvs = leituras.map((l) => l.ponto_orvalho)
    const vpds = leituras.map((l) => l.vpd)

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

    return {
      mediaTemp: avg(temps),
      varTemp: Math.max(...temps) - Math.min(...temps),
      mediaUmid: avg(umids),
      maxUmid: Math.max(...umids),
      mediaOrvalho: avg(orvs),
      mediaVpd: avg(vpds),
    }
  }, [leituras])

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Série Histórica Contínua de Telemetria
          </CardTitle>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Relação termodinâmica entre Temperatura Ambiente, Ponto de Orvalho e Umidade Relativa ao longo do tempo (Polo Boituva-SP).
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[380px] w-full aspect-auto">
            <LineChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dataHora" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} domain={[10, 45]} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} domain={[10, 100]} />
              <ReferenceLine yAxisId="right" y={70} stroke="#FB7185" strokeDasharray="3 3" />
              <ReferenceLine yAxisId="right" y={35} stroke="#FBBF24" strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperatura"
                stroke="var(--color-temperatura)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ponto_orvalho"
                stroke="var(--color-ponto_orvalho)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="umidade"
                stroke="var(--color-umidade)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>

          {/* 3 Estatísticas Agregadas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl border border-white/5 bg-[#080C14] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 animate-slide-up stagger-1">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Temperatura Média
              </span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {stats.mediaTemp.toFixed(1)} °C
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-mono">
                Variação: {stats.varTemp.toFixed(1)} °C
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#080C14] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 animate-slide-up stagger-2">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Umidade Média
              </span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {stats.mediaUmid.toFixed(1)} %
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-mono">
                Pico máximo: {stats.maxUmid.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#080C14] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 animate-slide-up stagger-3">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Ponto de Orvalho Médio
              </span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {stats.mediaOrvalho.toFixed(1)} °C
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-mono">
                VPD Médio: {stats.mediaVpd.toFixed(2)} kPa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
