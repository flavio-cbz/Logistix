import logging
from fastapi import Request, FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
from typing import Optional, Dict, Any
from jose import jwt, JWTError, ExpiredSignatureError

# Ajouter le chemin du projet au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mise à jour des importations
from market_analyzer import analyze_market_by_product_name
from api.database import save_market_analysis, get_all_market_analyses, delete_market_analysis, get_user_by_id, get_market_analysis_by_id

app = FastAPI(title="Vinted Market Analysis API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.getenv("JWT_SECRET", "a-very-secure-secret-key-that-is-at-least-32-characters-long").encode('utf-8')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> Dict:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Non authentifié: jeton invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
        
        user = get_user_by_id(user_id)
        if user is None:
            raise credentials_exception
        
        return user
    except JWTError:
        raise credentials_exception

# Mise à jour des modèles Pydantic
class AnalysisRequest(BaseModel):
    search_text: str
    vintedToken: str # Renommé de access_token à vintedToken
    test_mode: Optional[bool] = False

class AnalyzeResponse(BaseModel):
    analysisTimestamp: str
    priceAnalysis: Dict[str, float] 
    summary: Dict[str, Any] 
    brandDistribution: Dict[str, int] 
    conditionDistribution: Dict[str, int] 
    productName: str
    searchMeta: Dict[str, Any] 
    saved_id: Optional[str] = None 

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Mise à jour de la route /api/analyze
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_market(analysis_request: AnalysisRequest, current_user: Dict = Depends(get_current_active_user)):
    try:
        analysis_result = analyze_market_by_product_name(
            analysis_request.search_text,
            analysis_request.vintedToken, # Utilisation de vintedToken
            analysis_request.test_mode
        )

        # Enrichir la réponse
        analysis_result["productName"] = analysis_request.search_text
        analysis_result["searchMeta"] = {
            "search_text": analysis_request.search_text,
        }
        
        # Sauvegarder dans la base de données
        try:
            market_data = {
                "productName": analysis_result["productName"],
                "currentPrice": analysis_result["priceAnalysis"]["average"],
                "minPrice": analysis_result["priceAnalysis"]["min"],
                "maxPrice": analysis_result["priceAnalysis"]["max"],
                "avgPrice": analysis_result["priceAnalysis"]["average"],
                "salesVolume": analysis_result["summary"]["itemsFound"],
                "competitorCount": analysis_result["summary"]["sellersCount"],
                "trend": "stable",
                "trendPercentage": 0,
                "lastUpdated": analysis_result["analysisTimestamp"],
                "recommendedPrice": analysis_result["priceAnalysis"]["average"],
                "marketShare": 0,
                "demandLevel": "medium",
                "competitors": []
            }
            saved_id = save_market_analysis(current_user["id"], market_data)
            analysis_result["saved_id"] = saved_id
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de l'analyse: {e}")
            analysis_result["saved_id"] = None

        return analysis_result
        
    except ConnectionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur interne inattendue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

@app.get("/api/analyses")
async def get_analyses(current_user: Dict = Depends(get_current_active_user)):
    try:
        analyses = get_all_market_analyses(current_user["id"])
        return analyses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, current_user: Dict = Depends(get_current_active_user)):
    try:
        analysis = get_market_analysis_by_id(current_user["id"], analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analyse non trouvée")
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str, current_user: Dict = Depends(get_current_active_user)):
    try:
        success = delete_market_analysis(current_user["id"], analysis_id)
        if not success:
            raise HTTPException(status_code=404, detail="Analyse non trouvée")
        return {"message": "Analyse supprimée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)