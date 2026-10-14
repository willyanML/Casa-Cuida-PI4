import { useState, useMemo } from "react"
import { Download, Search, ChevronLeft, ChevronRight, Loader2, FileSpreadsheet } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import type { Leitura } from "@/types"
import { getExportarCsvUrl, getStoredToken } from "@/lib/api"

interface TabelaTelemetriaProps {
  leituras: Leitura[]
}

export function TabelaTelemetria({ leituras }: TabelaTelemetriaProps) {
  const [busca, setBusca] = useState("")
  const [pagina, setPagina] = useState(1)
  const [baixandoCsv, setBaixandoCsv] = useState(false)
  const itensPorPagina = 12

  const leiturasFiltradas = useMemo(() => {
    return leituras
      .filter((l) => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return (
          l.sensor_id.toLowerCase().includes(termo) ||
          l.risco_rotulo.toLowerCase().includes(termo) ||
          l.timestamp.toLowerCase().includes(termo)
        )
      })
      .reverse() // mais recentes primeiro
  }, [leituras, busca])

  const totalPaginas = Math.ceil(leiturasFiltradas.length / itensPorPagina) || 1
  const dadosPagina = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina
    return leiturasFiltradas.slice(inicio, inicio + itensPorPagina)
  }, [leiturasFiltradas, pagina, itensPorPagina])

  const handleBaixarCsv = async () => {
    try {
      setBaixandoCsv(true)
      const token = getStoredToken()
      const headers: Record<string, string> = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      const res = await fetch(getExportarCsvUrl(), { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "telemetria_casa_cuida.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Erro ao baixar CSV:", err)
    } finally {
      setBaixandoCsv(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="bg-[#0F172A] border-white/10 hover:border-white/20 transition-all duration-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[#38BDF8]" />
                Registros Históricos de Telemetria IoT
              </CardTitle>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Pacotes capturados pelo nó sensor ESP32 e gravados no banco de dados (Polo Boituva-SP).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBaixarCsv}
                disabled={baixandoCsv}
                className="gap-1.5 text-xs text-[#38BDF8] border-[#0284C7]/30 hover:bg-[#0284C7]/10 transition-colors cursor-pointer"
              >
                {baixandoCsv ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Baixar Planilha CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Busca e Filtro */}
          <div className="flex items-center gap-2 max-w-sm rounded-lg border border-white/10 bg-[#080C14] px-3 py-1.5">
            <Search className="h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Filtrar por data, sensor ou status..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
              className="w-full bg-transparent text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none"
            />
          </div>

          {/* Tabela com alinhamento rigoroso e tipografia mono */}
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-[#080C14]">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-[#94A3B8]">Data e Hora</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8]">Sensor</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8] text-right">Temp (°C)</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8] text-right">Umidade (%)</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8] text-right">Orvalho (°C)</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8] text-right">VPD (kPa)</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8]">Diagnóstico IA</TableHead>
                  <TableHead className="text-xs font-semibold text-[#94A3B8] text-right">Confiança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPagina.length > 0 ? (
                  dadosPagina.map((l) => (
                    <TableRow
                      key={l.id}
                      className={`border-white/5 transition-colors duration-150 hover:bg-white/5 ${
                        l.risco_classe === 2
                          ? "bg-rose-500/[0.05]"
                          : l.risco_classe === 1
                          ? "bg-amber-500/[0.03]"
                          : ""
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-[#94A3B8]">
                        {l.timestamp}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#F8FAFC]">
                        {l.sensor_id === "esp32_quarto_01" ? "Guarda-Roupa" : l.sensor_id}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-amber-400 text-right">
                        {l.temperatura.toFixed(1)}
                      </TableCell>
                      <TableCell
                        className={`font-mono font-bold text-right ${
                          l.umidade >= 70
                            ? "text-rose-400"
                            : l.umidade < 35
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {l.umidade.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-mono text-indigo-300 text-right">
                        {l.ponto_orvalho.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-mono text-[#94A3B8] text-right">
                        {l.vpd.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {l.risco_classe === 2 ? (
                          <Badge variant="destructive" className="font-medium">{l.risco_rotulo}</Badge>
                        ) : l.risco_classe === 1 ? (
                          <Badge variant="warning" className="font-medium">{l.risco_rotulo}</Badge>
                        ) : (
                          <Badge variant="success" className="font-medium">{l.risco_rotulo}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-[#94A3B8]">
                        {l.probabilidade.toFixed(0)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[#64748B]">
                      Nenhum registro encontrado para o filtro aplicado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-2">
            <span>
              Mostrando {dadosPagina.length} de {leiturasFiltradas.length} leituras
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="h-7 w-7 p-0 border-white/10 text-[#94A3B8] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-mono px-2 text-[#F8FAFC]">
                {pagina} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="h-7 w-7 p-0 border-white/10 text-[#94A3B8] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
