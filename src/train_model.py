"""
Pipeline de Treinamento e Avaliação de Machine Learning
Projeto: Casa Cuida (UNIVESP PI4)

Treina e compara algoritmos supervisionados (Random Forest vs Gradient Boosting)
para a classificação preditiva de risco psicrométrico de mofo e secura respiratória.
Gera métricas completas para compor o Relatório Parcial e Final do PI.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

from src.physics import extrair_atributos_completos

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def gerar_dataset_calibrado(num_amostras: int = 4000) -> pd.DataFrame:
    """
    Gera uma base de dados realista de microclima residencial cobrindo:
    1. Dias amenos e seguros (conforto térmico)
    2. Dias secos de inverno (umidade baixa < 35%)
    3. Dias chuvosos/abafados com saturação de umidade (>70%) e condensação
    """
    np.random.seed(42)
    dados = []
    
    # Faixas climáticas realistas no Brasil
    for _ in range(num_amostras):
        cenario = np.random.choice(["confortavel", "seco", "umido_critico"], p=[0.45, 0.25, 0.30])
        
        if cenario == "confortavel":
            temp = np.random.normal(23.0, 3.0)
            umid = np.random.normal(52.0, 7.0)
        elif cenario == "seco":
            temp = np.random.normal(26.0, 4.0)
            umid = np.random.normal(28.0, 5.0)
        else: # umido_critico
            temp = np.random.normal(24.0, 3.5)
            umid = np.random.normal(79.0, 6.0)
            
        temp = float(np.clip(temp, 12.0, 40.0))
        umid = float(np.clip(umid, 15.0, 98.0))
        
        attr = extrair_atributos_completos(temp, umid)
        dados.append(attr)
        
    df = pd.DataFrame(dados)
    os.makedirs(DATA_DIR, exist_ok=True)
    caminho_csv = os.path.join(DATA_DIR, "dataset_climatico.csv")
    df.to_csv(caminho_csv, index=False)
    print(f"-> Dataset gerado com sucesso: {caminho_csv} ({len(df)} amostras)")
    return df

def treinar_e_avaliar():
    """Executa o pipeline completo de treinamento, avaliação e persistência do modelo."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    df = gerar_dataset_calibrado()
    
    # Definição de Features e Target
    features = ["temperatura", "umidade", "ponto_orvalho", "vpd", "delta_orvalho"]
    X = df[features]
    y = df["classe_referencia"]
    
    # Divisão Estratificada 80/20
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print("\n--- INICIANDO TREINAMENTO E COMPARAÇÃO DE MODELOS ---")
    
    # Modelo 1: Random Forest Classifier (Principal)
    rf = RandomForestClassifier(
        n_estimators=120,
        max_depth=9,
        min_samples_split=4,
        random_state=42
    )
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    acc_rf = accuracy_score(y_test, y_pred_rf)
    f1_rf = f1_score(y_test, y_pred_rf, average="macro")
    cv_rf = cross_val_score(rf, X_train, y_train, cv=5).mean()
    
    # Modelo 2: Gradient Boosting Classifier (Confronto Acadêmico)
    gb = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=5,
        random_state=42
    )
    gb.fit(X_train, y_train)
    y_pred_gb = gb.predict(X_test)
    acc_gb = accuracy_score(y_test, y_pred_gb)
    f1_gb = f1_score(y_test, y_pred_gb, average="macro")
    cv_gb = cross_val_score(gb, X_train, y_train, cv=5).mean()
    
    print(f"Random Forest     -> Acurácia: {acc_rf:.4f} | F1-Score: {f1_rf:.4f} | CV (5-fold): {cv_rf:.4f}")
    print(f"Gradient Boosting -> Acurácia: {acc_gb:.4f} | F1-Score: {f1_gb:.4f} | CV (5-fold): {cv_gb:.4f}")
    
    # Escolha do melhor modelo (Random Forest)
    melhor_modelo = rf
    modelo_nome = "Random Forest Classifier"
    y_pred = y_pred_rf
    
    # Matriz de Confusão e Relatório
    cm = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, output_dict=True)
    
    # Importância das Features
    importancias = dict(zip(features, [round(float(v), 4) for v in melhor_modelo.feature_importances_]))
    print("\n--- IMPORTÂNCIA DAS VARIÁVEIS (FEATURE IMPORTANCE) ---")
    for f, imp in sorted(importancias.items(), key=lambda x: x[1], reverse=True):
        print(f"  * {f:15}: {imp * 100:.2f}%")
        
    # Serialização do Modelo
    caminho_modelo = os.path.join(MODELS_DIR, "mold_risk_model.pkl")
    joblib.dump(melhor_modelo, caminho_modelo)
    print(f"\n-> Modelo salvo em: {caminho_modelo}")
    
    # Metadados e Métricas para o Relatório do PI e o Dashboard
    metadados = {
        "modelo_escolhido": modelo_nome,
        "features": features,
        "classes": {
            "0": "Ambiente Seguro / Confortável",
            "1": "Alerta: Ar Seco / Risco Respiratório",
            "2": "Alerta Crítico: Risco de Mofo"
        },
        "metricas": {
            "acuracia": round(float(acc_rf), 4),
            "f1_score_macro": round(float(f1_rf), 4),
            "cv_score": round(float(cv_rf), 4),
            "total_treino": len(X_train),
            "total_teste": len(X_test)
        },
        "comparativo_modelos": [
            {"modelo": "Random Forest", "acuracia": round(float(acc_rf), 4), "f1_macro": round(float(f1_rf), 4), "cv_score": round(float(cv_rf), 4)},
            {"modelo": "Gradient Boosting", "acuracia": round(float(acc_gb), 4), "f1_macro": round(float(f1_gb), 4), "cv_score": round(float(cv_gb), 4)}
        ],
        "matriz_confusao": cm,
        "importancia_atributos": importancias,
        "relatorio_classificacao": report
    }
    
    caminho_meta = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(caminho_meta, "w", encoding="utf-8") as f:
        json.dump(metadados, f, indent=4, ensure_ascii=False)
    print(f"-> Metadados acadêmicos salvos em: {caminho_meta}")
    
    return metadados

if __name__ == "__main__":
    treinar_e_avaliar()
