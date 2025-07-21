import requests
import json
import os

def get_fastapi_token() -> str:
    # Cette fonction est un placeholder. Dans un vrai scénario,
    # vous auriez un endpoint de login sur l'API FastAPI
    # qui retournerait un token JWT.
    # Pour ce test, nous allons générer un token simple
    # en utilisant le secret partagé.
    from jose import jwt
    JWT_SECRET = os.getenv("JWT_SECRET", "votre_secret_jwt_tres_securise_a_changer_en_production").encode('utf-8')
    # L'ID utilisateur '1' est utilisé pour l'exemple.
    token_data = {"id": "1", "sub": "testuser"} 
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    return token

def get_market_analysis_by_id_direct(analysis_id: str, token: str) -> dict:
    """
    Récupère une analyse de marché par son ID directement depuis l'API FastAPI.
    """
    url = f"http://localhost:8000/api/analyses/{analysis_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return {"status": "success", "data": response.json(), "statusCode": response.status_code}
    except requests.exceptions.HTTPError as e:
        return {"status": "error", "message": f"HTTP {e.response.status_code}: {e.response.text}", "statusCode": e.response.status_code}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": f"Erreur de requête: {e}", "statusCode": None}


if __name__ == "__main__":
    ANALYSIS_ID_TO_TEST = "analysis_1752403107648"

    try:
        print("Génération du token JWT de test...")
        jwt_token = get_fastapi_token()

        print(f"\nTentative de récupération de l'analyse avec l'ID: {ANALYSIS_ID_TO_TEST} directement depuis FastAPI...")
        analysis_result = get_market_analysis_by_id_direct(ANALYSIS_ID_TO_TEST, jwt_token)
        
        if analysis_result["status"] == "success":
            print("Analyse récupérée avec succès:")
            print(json.dumps(analysis_result["data"], indent=2))
        else:
            print(f"Échec de la récupération de l'analyse: {analysis_result['message']}")

    except Exception as e:
        print(f"Une erreur est survenue: {e}")
