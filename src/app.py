"""
Casa Cuida - Frontend Launcher (shadcn/ui + React + Vite)
Projeto Integrador UNIVESP (Eixo de Computação)

A UI/UX do sistema foi completamente reformulada do zero e migrada para:
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Componentes shadcn/ui (Card, Badge, Button, Tabs, Table, Slider, Select, Alert, Progress, Separator)
- Ícones Lucide React
- Gráficos Recharts (responsivos e animados)

Código-fonte do frontend:
  frontend/
  ├── src/
  │   ├── components/ui/ (Componentes oficiais shadcn/ui)
  │   ├── components/    (VisaoGeral, MetricasGraficos, LaboratorioIA, TabelaTelemetria, DossieAcademico)
  │   ├── lib/api.ts     (Cliente HTTP para ingestão e telemetria)
  │   └── App.tsx        (Layout principal com navegação lateral e acessibilidade Gov.br)
"""

import os
import sys
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def main():
    print("Iniciando Dashboard Web (React + shadcn/ui + Tailwind)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    cmd = [npm_cmd, "run", "dev", "--", "--port", "8501"]
    subprocess.run(cmd, cwd=FRONTEND_DIR, shell=True)

if __name__ == "__main__":
    main()
