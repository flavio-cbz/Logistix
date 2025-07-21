from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
import os
from .database import save_analysis_to_db
from .dependencies import get_current_user
from ..find_representative_item import find_representative_item
from ..analyze_similar_sold_items import analyze_similar_sold_items
from .config import JWT_SECRET

app = FastAPI()

class AnalysisRequest(BaseModel):
    brand_id: int
    catalog_id: int
    status_id: int
    access_token: str

class User(BaseModel):
    id: int
    username: str
    email: str

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Vinted Market Analysis API is running"}

@app.post("/api/analyze")
def analyze_market(request: AnalysisRequest, current_user: User = Depends(get_current_user)):
    try:
        item_id = find_representative_item(request.brand_id, request.catalog_id, request.status_id, request.access_token)
        if item_id is None:
            raise HTTPException(status_code=404, detail="Aucun article représentatif trouvé")
        
        analysis_data = analyze_similar_sold_items(item_id, request.access_token)
        analysis_id = save_analysis_to_db(current_user.id, analysis_data)
        
        return {"message": "Analyse de marché sauvegardée avec succès", "analysis_id": analysis_id}

    except ConnectionError as e:
        raise HTTPException(status_code=401, detail=f"Erreur d'authentification: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {e}")


@app.get("/api/analyses")
def get_analyses(current_user: User = Depends(get_current_user)):
    return []

@app.delete("/api/analyses/{analysis_id}")
def delete_analysis(analysis_id: str, current_user: User = Depends(get_current_user)):
    return {"message": f"Analyse {analysis_id} supprimée avec succès"}