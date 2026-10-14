#!/usr/bin/env bash
# Script de build unificado para Render Web Service
# Compila dependências Python e a SPA React + Vite

set -o errexit

echo "--- [1/3] Instalando dependências Python ---"
pip install --upgrade pip
pip install -r requirements.txt

echo "--- [2/3] Compilando Frontend React 19 + Vite ---"
cd frontend
npm install
npm run build
cd ..

echo "--- [3/3] Build finalizado com sucesso! ---"
