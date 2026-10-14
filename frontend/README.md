# Casa Cuida · Frontend (Painel Web)

> **Single Page Application (SPA) para Monitoramento Microclimático e Prevenção de Mofo**  
> **Projeto Integrador IV (PI4) · UNIVESP (Polo Boituva - SP)**  

---

## 1. Visão Geral

O frontend do **Casa Cuida** é uma aplicação web moderna de alto desempenho desenvolvida em **React 19**, **TypeScript** e **Tailwind CSS**. A interface foi projetada com base nos princípios do **Design Centrado no Ser Humano (HCD)**, proporcionando aos moradores da residência uma leitura imediata do estado do seu guarda-roupa, além de orientações preventivas claras e sem jargões desnecessários.

A navegação é dividida em dois blocos funcionais:
1. **Menu Principal (Uso Doméstico):** focado no acompanhamento diário do guarda-roupa (`Visão Geral`, `Métricas & Gráficos`, `Histórico de Leituras`).
2. **Seção Retrátil (Avançado / Acadêmico):** agrupa o `Simulador de Clima` e o `Dossiê Acadêmico` da UNIVESP, permitindo que a banca examinadora avalie a fundamentação científica sem poluir o uso diário da família.

---

## 2. Tecnologias Utilizadas

- **React 19 & TypeScript:** componentização reativa com tipagem estática rigorosa.
- **Vite:** servidor de desenvolvimento ultrarrápido e empacotamento otimizado para produção.
- **Tailwind CSS:** estilização utilitária moderna com paleta escura contrastante (*Dark Mode*).
- **Recharts & Shadcn Chart:** renderização de gráficos temporais de área, linhas e matrizes visuais.
- **Lucide React:** biblioteca de ícones semânticos para identificação rápida de status e materiais.
- **Radix UI:** primitivos acessíveis para componentes de interface (*Dialog, Select, Slider, Tabs*).

---

## 3. Estrutura de Componentes e Telas

```text
frontend/src/
├── components/
│   ├── ui/                     # Componentes base acessíveis (Alert, Badge, Card, etc.)
│   ├── VisaoGeral.tsx          # Painel principal: KPIs, Gráfico de Área e Central de Prevenção
│   ├── MetricasGraficos.tsx    # Análise detalhada de temperatura, umidade e dispersão
│   ├── TabelaTelemetria.tsx    # Listagem tabular da série temporal de pacotes do ESP32
│   ├── LaboratorioIA.tsx       # Simulador interativo ("E se?") com sliders manuais
│   ├── DossieAcademico.tsx     # Métricas de treino da IA, matriz de confusão e equações
│   └── LoginPage.tsx           # Tela de autenticação com validação de credenciais
├── lib/
│   ├── api.ts                  # Cliente HTTP integrado à API FastAPI (/api)
│   └── utils.ts                # Utilitários de combinação de classes CSS (cn)
├── types.ts                    # Interfaces TypeScript (Leitura, Prevenção, Materiais)
├── App.tsx                     # Orquestrador de rotas, estado de autenticação e layout
└── main.tsx                    # Ponto de entrada React montado no DOM
```

---

## 4. Recursos da Central de Prevenção Inteligente

Implementada no componente `VisaoGeral.tsx`, a central exibe em tempo real:
- **Folga Térmica até o Ponto de Orvalho:** monitora a diferença $\Delta T = T_{amb} - T_{orvalho}$ e apresenta uma barra de margem térmica com alertas visuais (*Margem Segura*, *Atenção Crítica*, *Condensação Iminente*).
- **Simulação da Madrugada:** calcula o impacto de um resfriamento de 2 °C, 3 °C ou 4 °C no guarda-roupa fechado, alertando se o vapor d'água atingirá a saturação líquida durante a noite.
- **Matriz de Proteção por Material:**
  - *Calçados & Couro:* faixa de 45% a 65% UR (norma Smithsonian/CCI);
  - *Roupas & Fibras Têxteis:* faixa de 30% a 60% UR (norma EPA/OMS);
  - *Estrutura & Fundo de Madeira:* prevenção de umidade na alvenaria externa (norma ASHRAE 160).
- **Guia Prático de Ação:** horários exatos para arejamento (11h às 15h) e gerenciamento de desumidificadores de mercado (sílica e cloreto de cálcio).

---

## 5. Scripts Disponíveis

Na pasta `frontend/`:

```bash
# Instalação das dependências
npm install

# Inicialização do servidor local de desenvolvimento (HMR ativo)
npm run dev

# Compilação de produção (type-check com tsc e build com vite)
npm run build

# Validação e linting estático com oxlint
npm run lint

# Pré-visualização da build localmente
npm run preview
```

---

## 6. Comunicação com a API

A camada de serviço em `src/lib/api.ts` conecta-se aos seguintes endpoints principais do backend:
- `GET /api/leituras`: consulta os pacotes mais recentes transmitidos pelo ESP32;
- `GET /api/metricas`: obtém médias, máximas e contagens de risco acumuladas;
- `GET /api/prevencao/atual`: recebe o diagnóstico preventivo aprofundado;
- `POST /api/simular`: executa inferências para testes do simulador manual;
- `POST /api/leituras/limpar`: zera o histórico para início de novas medições;
- `GET /api/exportar/csv`: download de arquivo com o histórico completo para relatórios.
