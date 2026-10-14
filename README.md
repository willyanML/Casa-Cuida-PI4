# Casa Cuida · Sistema IoT de Monitoramento Microclimático e Prevenção de Mofo

> **Projeto Integrador IV (PI4)**  
> **Universidade Virtual do Estado de São Paulo (UNIVESP)**  
> **Polo:** Boituva - SP  

---

## 1. Visão Geral

O **Casa Cuida** é uma solução tecnológica desenvolvida para monitoramento contínuo de microclimas residenciais em ambientes vulneráveis à umidade excessiva e proliferação de fungos (mofo/bolor), como armários embutidos e quartos com baixa circulação de ar.

O sistema integra sensores físicos, equações termodinâmicas de psicrometria (cálculo de Ponto de Orvalho e Déficit de Pressão de Vapor - VPD) e um classificador estatístico para emitir recomendações preventivas em tempo real aos moradores.

---

## 2. Arquitetura da Solução

O projeto é dividido em quatro camadas modulares:

```
+------------------+         HTTP POST         +------------------------+
|  Nó Sensor IoT   | ------------------------> |   API de Ingestão      |
|  (ESP32 + DHT22) |   (Header: X-Sensor-Key)  |   (FastAPI / Python)   |
+------------------+                           +------------------------+
                                                           |
                                           +---------------+---------------+
                                           |                               |
                                           v                               v
                              +------------------------+      +------------------------+
                              |   Banco de Dados       |      |   Painel Web           |
                              |   (SQLite / Postgres)  |      |   (React / TypeScript) |
                              +------------------------+      +------------------------+
```

1. **Hardware / Embarcados (`hardware/`):**
   - Microcontrolador ESP32 DevKit V1 conectado a sensor digital DHT22.
   - Leitura periódica (temperatura e umidade relativa) com transmissão via HTTP POST com autenticação por chave de cabeçalho (`X-Sensor-Key`).

2. **Cálculo Físico e Classificação (`src/`):**
   - Processamento psicrométrico utilizando a formulação de Magnus-Tetens para dedução do Ponto de Orvalho e cálculo da pressão de vapor de saturação (VPD).
   - Classificador supervisionado (*Random Forest*) treinado para estratificação em 3 faixas de risco:
     - **Classe 0:** Ambiente Seguro / Confortável.
     - **Classe 1:** Ar Excessivamente Seco (Atenção Respiratória).
     - **Classe 2:** Risco Crítico de Condensação e Mofo.

3. **Backend REST (`src/ingestion_api.py`):**
   - Desenvolvido em FastAPI com endpoints de telemetria, análise histórica, exportação de relatórios em CSV e controle de acesso com autenticação segura.

4. **Frontend (`frontend/`):**
   - Dashboard analítico desenvolvido em React 19, TypeScript e Tailwind CSS, com visualização em gráficos temporais, tabela de registros e simulador de cenários.

---

## 3. Estrutura do Repositório

```text
├── data/
│   └── dataset_climatico.csv   # Base de dados climáticos para modelagem
├── frontend/                   # Interface Web (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # Componentes do Dashboard e Telas
│   │   ├── lib/                # Comunicação com a API
│   │   └── types.ts            # Tipagens do sistema
│   └── package.json
├── hardware/
│   └── esp32_sensor.ino        # Código-fonte C++ para ESP32
├── models/
│   ├── mold_risk_model.pkl     # Modelo treinado serializado
│   └── model_metadata.json     # Métricas de acurácia, recall e matriz de confusão
├── src/
│   ├── auth.py                 # Funções criptográficas de autenticação e tokens
│   ├── database.py             # Camada de persistência (SQLite / PostgreSQL)
│   ├── ingestion_api.py        # Servidor HTTP FastAPI
│   ├── iot_emulator.py         # Emulador de transmissões IoT para testes
│   ├── physics.py              # Formulação psicrométrica (Magnus-Tetens e VPD)
│   └── train_model.py          # Script de treinamento do classificador
├── tests/
│   └── test_system.py          # Testes automatizados de integração
├── build.sh                    # Script de build para hospedagem em nuvem
├── render.yaml                 # Configuração declarativa de deploy
└── requirements.txt            # Dependências Python
```

---

## 4. Instruções de Execução Local

### Pré-requisitos
- Python 3.10 ou superior
- Node.js 18 ou superior e npm

### 4.1. Configuração do Backend
```bash
# 1. Crie e ative um ambiente virtual
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
O servidor estará disponível em `http://127.0.0.1:8000` (documentação Swagger em `/docs`).

### 4.2. Configuração do Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse o painel web em `http://localhost:5173` ou conforme indicado no terminal.

### 4.3. Testes Automatizados
Para executar a suíte de testes unitários e de integração:
```bash
pytest tests/
```

---

## 5. Licença

Este projeto é desenvolvido para fins acadêmicos sob a licença MIT. Consulte o arquivo correspondente para mais detalhes.
