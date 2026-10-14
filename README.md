# Casa Cuida · Sistema IoT de Monitoramento Microclimático e Prevenção Inteligente de Mofo

> **Projeto Integrador IV (PI4)**  
> **Universidade Virtual do Estado de São Paulo (UNIVESP)**  
> **Polo:** Boituva - SP  
> **Cursos:** Engenharia de Computação &bull; Bacharelado em Ciência de Dados &bull; Tecnologia da Informação  

---

## 1. Visão Geral da Solução

O **Casa Cuida** é uma solução tecnológica ciberfísica e analítica desenvolvida para o monitoramento contínuo e a mitigação preventiva de umidade excessiva e proliferação biológica fúngica (*mofo/bolor*) em microclimas confinados residenciais, com foco especial no interior de guarda-roupas, sapateiras e quartos.

O sistema supera abordagens reativas convencionais (que agem apenas após o aparecimento de manchas pretas e odores desagradáveis) ao integrar:
- **Nó sensor físico IoT (ESP32 + DHT22)** transmitindo dados em tempo real via HTTPS com autenticação;
- **Engenharia psicrométrica avançada** fundamentada nas normas **ASHRAE 160**, **EPA** e **Smithsonian Institution** para cálculo do Ponto de Orvalho, Folga Térmica ($\Delta T = T_{amb} - T_{orvalho}$) e Déficit de Pressão de Vapor (VPD);
- **Modelo preditivo supervisionado (*Random Forest Classifier*)** para estratificação de risco ambiental e respiratório;
- **Central de Prevenção Inteligente** com simulação de queda noturna na madrugada e guia de preservação específico para calçados/couro, roupas/tecidos e madeira/fundo do móvel;
- **Painel Web moderno em React 19, TypeScript e Tailwind CSS**, com arquitetura modular que separa a operação residencial do dia a dia da documentação acadêmica da UNIVESP.

---

## 2. Arquitetura da Solução

```text
+------------------------+          HTTPS POST          +---------------------------+
|     Nó Sensor IoT      | ---------------------------> |      API de Ingestão      |
|    (ESP32 + DHT22)     |  Header: X-Sensor-Key        |    (FastAPI / Python 3)   |
|   hardware/esp32_sensor|  Payload: api_key + telemetria|    src/ingestion_api.py   |
+------------------------+                              +---------------------------+
                                                                      |
                                       +------------------------------+------------------------------+
                                       |                                                             |
                                       v                                                             v
                        +------------------------------+                              +------------------------------+
                        |     Banco de Dados Dual      |                              |     Classificador IA / ML    |
                        |  - SQLite (Local / Testes)   |                              |   Random Forest (scikit-learn)|
                        |  - Neon PostgreSQL (Nuvem)   |                              |   models/mold_risk_model.pkl |
                        +------------------------------+                              +------------------------------+
                                       |                                                             |
                                       +------------------------------+------------------------------+
                                                                      |
                                                                      v
                                                       +------------------------------+
                                                       |      Painel Web (SPA)        |
                                                       |   React 19 + TypeScript      |
                                                       |   Tailwind CSS + Recharts    |
                                                       |   frontend/src/App.tsx       |
                                                       +------------------------------+
```

### Camadas do Sistema:
1. **Camada Ciberfísica (`hardware/esp32_sensor.ino`):**
   - Microcontrolador ESP32 DevKit conectado ao sensor digital DHT22.
   - Amostragem periódica precisa (temperatura e umidade) enviada a cada 30 segundos via HTTPS com cliente seguro (`WiFiClientSecure`) e dupla camada de autenticação (`X-Sensor-Key` e payload JSON).

2. **Camada de Física Psicrométrica & IA (`src/physics.py` e `models/`):**
   - Formulação analítica de Magnus-Tetens para cálculo do Ponto de Orvalho.
   - Cálculo do Déficit de Pressão de Vapor (VPD) em kPa para avaliação de capacidade evaporativa.
   - Cálculo da Folga Térmica até o orvalho ($\Delta T$).
   - Simulação psicrométrica de resfriamento noturno (projeção sob quedas de 2 °C, 3 °C e 4 °C na madrugada com mesma umidade absoluta).
   - Classificador Random Forest treinado com validação cruzada (Acurácia > 97%, F1-Score Macro > 96%).

3. **Camada de Ingestão e Persistência (`src/ingestion_api.py` e `src/database.py`):**
   - Servidor HTTP de alta performance em FastAPI com endpoints de telemetria, simulação, diagnósticos preventivos e exportação CSV.
   - Arquitetura de banco de dados híbrida: opera nativamente com **SQLite** local e com **PostgreSQL Serverless (Neon)** em produção, com pooling de conexões e proteção transacional contra deadlocks.
   - Controle de acesso com autenticação de sessão (Cookies `HttpOnly` e Bearer Tokens criptografados).

4. **Camada de Interface com o Usuário (`frontend/`):**
   - Single Page Application (SPA) construída com React 19, Vite, TypeScript, Tailwind CSS e Recharts.
   - Interface focada no usuário residencial, com menu principal enxuto e seção retrátil para visualização dos dados acadêmicos do PI.

---

## 3. Central de Prevenção Inteligente do Guarda-Roupa

Em conformidade com normas técnicas de engenharia e biologia ambiental, a aplicação disponibiliza aos moradores da residência:

### A. Monitoramento de Folga Térmica até o Orvalho
Indica a margem em graus Celsius que a temperatura ambiente ou da alvenaria pode cair antes de provocar condensação de gotículas d'água líquida nas superfícies:
- **Folga $\le 2,5\text{ °C}$:** Condensação Iminente (alerta imediato);
- **Folga entre $2,5\text{ °C}$ e $4,0\text{ °C}$:** Atenção Crítica (queda noturna pode atingir o orvalho);
- **Folga $> 4,0\text{ °C}$:** Margem Térmica Segura.

### B. Simulação de Resfriamento da Madrugada
Calcula o comportamento esperado para quedas de 2 °C, 3 °C e 4 °C durante a madrugada fria com as portas do armário fechadas, alertando se a condensação ocorrerá antes do amanhecer.

### C. Matriz de Proteção por Tipo de Material
- **Calçados & Couro (Normas Smithsonian e Canadian Conservation Institute):**  
  *Faixa ideal de conservação:* **45% a 65% UR**.  
  Alerta contra mofo fúngico (> 65% UR, devido a óleos e colágeno) e contra ressecamento das fibras com microfissuras (< 40% UR).  
  *Ação prática:* retirar calçados de caixas plásticas fechadas (que retêm suor), usar saquinhos de TNT respiráveis e posicionar sachês de sílica gel.
- **Roupas & Fibras Têxteis (Normas EPA e OMS):**  
  *Faixa recomendada:* **30% a 60% UR**.  
  Alerta de retenção de umidade em fibras de algodão e lã (> 60% UR) e proliferação de ácaros e bolor em 48h (> 70% UR).  
  *Ação prática:* arejar casacos pesados e cobertores; nunca guardar peças com vestígios de suor ou recém-passadas a ferro ainda mornas.
- **Fundo do Armário & Madeira (Norma ASHRAE 160):**  
  *Requisito:* Folga térmica $> 3,5\text{ °C}$ e UR $< 65\%$.  
  Alerta de orvalho superficial no contato com paredes externas frias, evitando o estufamento de MDF e aglomerado.  
  *Ação prática:* manter o móvel afastado de 5 a 10 cm da parede externa para garantir fluxo de ar convectivo.

### D. Guia Prático de Ação Residencial
- **Janela de Arejamento:** horários recomendados para ventilação (abrir as portas entre **11h e 15h** em dias ensolarados de menor umidade externa; manter portas totalmente fechadas em dias de chuva e madrugadas frias).
- **Controle de Desumidificação:** instruções de posicionamento de potes de cloreto de cálcio na base do móvel (onde o ar frio e denso se deposita) e monitoramento do reservatório de água acumulada.

---

## 4. Estrutura do Repositório

```text
├── .env.local                  # Credenciais locais e strings de conexão (não comitadas)
├── data/
│   ├── dataset_climatico.csv   # Base histórica utilizada no treinamento dos modelos
│   └── telemetria.db           # Banco de dados local SQLite
├── frontend/                   # Interface Web (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── components/         # VisaoGeral, MetricasGraficos, LaboratorioIA, etc.
│   │   ├── lib/                # api.ts (comunicação REST com FastAPI)
│   │   ├── types.ts            # Interfaces TypeScript do ecossistema
│   │   └── App.tsx             # Aplicação principal e navegação modular
│   ├── package.json            # Dependências e scripts do frontend
│   └── vite.config.ts          # Configuração de compilação Vite
├── hardware/
│   ├── esp32_sensor.ino        # Código-fonte C++ para firmware do ESP32 (HTTPS/POST)
│   └── wokwi_diagram.json      # Esquema de simulação ciberfísica no Wokwi
├── models/
│   ├── mold_risk_model.pkl     # Modelo treinado serializado (Random Forest)
│   └── model_metadata.json     # Metadados de validação, acurácia e matriz de confusão
├── src/
│   ├── auth.py                 # Funções criptográficas de autenticação e tokens
│   ├── database.py             # Camada de persistência dual (SQLite / Neon PostgreSQL)
│   ├── ingestion_api.py        # Servidor HTTP FastAPI (telemetria, prevenção e SPA)
│   ├── iot_emulator.py         # Emulador de transmissões IoT para testes
│   ├── physics.py              # Cálculos psicrométricos, simulação noturna e materiais
│   └── train_model.py          # Script de treino e validação cruzada do classificador
├── tests/
│   └── test_system.py          # Testes automatizados ponta a ponta (pytest)
├── build.sh                    # Script de build para deployment em nuvem
├── GUIA_E_DOCUMENTACAO_RELATORIOS_PI.md # Guia completo para relatórios acadêmicos da UNIVESP
├── package.json                # Gerenciador de tarefas raiz
├── render.yaml                 # Configuração declarativa de deploy no Render
├── requirements.txt            # Dependências Python do backend
└── README.md                   # Este documento
```

---

## 5. Instruções de Execução Local

### Pré-requisitos
- **Python 3.10 ou superior**
- **Node.js 18 ou superior e npm**
- **Git**

### 5.1. Inicialização do Backend
```bash
# 1. Crie e ative o ambiente virtual Python
python -m venv .venv

# No Windows:
.\.venv\Scripts\activate
# No Linux/Mac:
source .venv/bin/activate

# 2. Instale as dependências
pip install -r requirements.txt

# 3. Inicialize o servidor FastAPI
uvicorn src.ingestion_api:app --reload --port 8000
```
O servidor estará acessível em `http://127.0.0.1:8000`.  
A documentação interativa Swagger está disponível em `http://127.0.0.1:8000/docs`.

### 5.2. Inicialização do Frontend
Em um novo terminal:
```bash
cd frontend
npm install
npm run dev
```
O painel estará disponível em `http://localhost:5173`.

### 5.3. Execução dos Testes Automatizados
A suíte de testes ponta a ponta valida a física psicrométrica, banco de dados, machine learning, endpoints da API e a nova rotina de prevenção:
```bash
pytest tests/ -v
```

### 5.4. Compilação de Produção
Para compilar a aplicação React em arquivos estáticos prontos para distribuição pelo FastAPI:
```bash
npm run build
```

---

## 6. Referências Normativas e Científicas

1. **ASHRAE Standard 160:** *Criteria for Moisture-Control Design Analysis in Buildings*. American Society of Heating, Refrigerating and Air-Conditioning Engineers, Atlanta, 2021.
2. **EPA (U.S. Environmental Protection Agency):** *A Brief Guide to Mold, Moisture, and Your Home*. EPA 402-K-02-003, Washington, D.C.
3. **World Health Organization (WHO):** *WHO Guidelines for Indoor Air Quality: Dampness and Mould*. Copenhagen: WHO Regional Office for Europe, 2009.
4. **Canadian Conservation Institute (CCI) & Smithsonian Museum Conservation Institute:** *Care of Leather and Textiles*. Technical Guidelines for Organic Materials Preservation, Washington / Ottawa.
5. **AL-FUQAHA, A. et al.:** *Internet of Things: A survey on enabling technologies, protocols, and applications*. IEEE Communications Surveys & Tutorials, 2015.

---

## 7. Licença

Este projeto é desenvolvido para fins acadêmicos e comunitários no âmbito do Projeto Integrador da UNIVESP sob a licença MIT.
