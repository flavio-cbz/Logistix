#!/usr/bin/env python3
"""
Script pour démarrer l'API FastAPI Vinted Market Analysis
"""
import uvicorn
import sys
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # S'assurer que le répertoire de travail est la racine du projet
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    os.chdir(project_root)
    sys.path.insert(0, project_root)

    # Charger les variables d'environnement depuis le fichier .env à la racine du projet
    env_path = os.path.join(project_root, '.env')
    if os.path.exists(env_path):
        print(f"✅ Fichier .env trouvé à: {env_path}")
        load_dotenv(dotenv_path=env_path)
    else:
        print(f"⚠️  Attention: Fichier .env non trouvé à l'emplacement attendu: {env_path}")
        print("   L'application pourrait ne pas fonctionner correctement sans les variables d'environnement.")

    print("🚀 Démarrage de l'API Vinted Market Analysis...")
    print("📍 URL: http://localhost:8000")
    print("📋 Documentation: http://localhost:8000/docs")
    print("🔧 Redoc: http://localhost:8000/redoc")
    print("\n⚠️  Assurez-vous d'avoir installé les dépendances:")
    print("   pip install -r scripts/python/api/requirements.txt")
    print("\n🛑 Pour arrêter: Ctrl+C\n")

    # Utiliser un chemin d'application relatif à la nouvelle racine du projet
    app_path = "scripts.python.api.main:app"

    try:
        uvicorn.run(
            app_path,
            host="localhost",
            port=8000,
            reload=True,
            log_level="info",
            reload_dirs=[os.path.join(project_root, 'scripts')] # Surveiller le répertoire scripts
        )
    except KeyboardInterrupt:
        print("\n🛑 Arrêt de l'API...")
    except Exception as e:
        print(f"❌ Erreur lors du démarrage: {e}")
        sys.exit(1)