#!/usr/bin/env python3
"""
Script de configuration de l'environnement Python pour l'API Vinted Market Analysis
"""
import subprocess
import sys
import os

def install_dependencies():
    """Installation des dépendances nécessaires sans pandas spécifique"""
    print("🔧 Installation des dépendances de base...")
    dependencies = [
        "fastapi>=0.104.1",
        "uvicorn[standard]>=0.24.0",
        "pydantic>=2.5.0",
        "requests>=2.31.0",
        "pytest>=7.4.3",
        "pytest-asyncio>=0.21.1"
    ]
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install"] + dependencies, check=True)
        print("✅ Dépendances de base installées avec succès!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'installation des dépendances: {e}")
        return False
    
    print("\n🔧 Installation de pandas (sans version spécifique pour compatibilité)...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "pandas"], check=True)
        print("✅ Pandas installé avec succès!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'installation de pandas: {e}")
        return False
    
    return True

def main():
    """Fonction principale"""
    print("🚀 Configuration de l'environnement pour l'API Vinted Market Analysis")
    
    if not install_dependencies():
        print("❌ Échec de la configuration. Veuillez vérifier les erreurs ci-dessus.")
        sys.exit(1)
    
    print("\n✅ Configuration terminée avec succès!")
    print("\n📋 Pour démarrer l'API, exécutez: python start_api.py")

if __name__ == "__main__":
    main()
