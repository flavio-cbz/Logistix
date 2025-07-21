import requests
import pandas as pd
import json
from datetime import datetime, timezone
import numpy as np
import logging
from data_persistence import init_db, save_analysis, get_historical_analyses # Correction de l'importation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialiser la base de données au démarrage du script
init_db()

def normalize_brand_name(brand_name: str) -> str:
    """Normalizes brand names to correct common typos."""
    corrections = {
        "nik": "nike",
        "addidas": "adidas",
        "pumaa": "puma",
        "zaraa": "zara",
        "h&m": "h&m"
        # On pourra ajouter d'autres corrections ici
    }
    return corrections.get(brand_name.lower(), brand_name)

def calculate_kpis(df: pd.DataFrame, search_text: str) -> dict:
    """
    Calcule les indicateurs clés de performance (KPIs) basés sur les données analysées.
    """
    kpis = {}

    # Prix Optimal Recommandé (basé sur la moyenne pour l'instant, peut être affiné avec ML)
    average_price = df["price"].mean() if not df.empty else 0
    kpis["prixOptimalRecommande"] = round(average_price * 0.95, 2) if average_price > 0 else 0 # Exemple: 5% en dessous de la moyenne

    # Taux de Rotation (Sell-Through Rate) - Simulation car données non directement disponibles
    # Pour un calcul réel, il faudrait le nombre d'articles listés et vendus sur une période.
    # Ici, nous allons simuler un taux basé sur la présence d'articles vendus.
    total_listed_items_estimate = len(df) * 2 # Estimation, à remplacer par une vraie donnée si disponible
    if total_listed_items_estimate > 0:
        kpis["tauxDeRotation"] = round((len(df) / total_listed_items_estimate) * 100, 2)
    else:
        kpis["tauxDeRotation"] = 0.0

    # Part de Marché Relative (PMR) - Simulation
    # Nécessiterait des données sur les concurrents.
    kpis["partDeMarcheRelative"] = "N/A" # À implémenter avec des données réelles de concurrents

    # Score de Compétitivité
    # Basé sur la variabilité des prix (écart-type) et le nombre de vendeurs.
    price_std = df["price"].std() if len(df) > 1 else 0
    num_sellers = df["seller_login"].nunique() if not df.empty else 0
    # Un score plus élevé indique une plus grande compétitivité (plus de vendeurs, moins de dispersion des prix)
    # Formule simple: (1 / (price_std + 1)) * num_sellers
    kpis["scoreCompetitivite"] = round((1 / (price_std + 1)) * num_sellers, 2) if num_sellers > 0 else 0.0

    # Tendance des Prix sur 30 Jours
    # Nécessite des données historiques. Récupérer les analyses passées.
    historical_analyses = get_historical_analyses(search_text, limit=30) # Récupère les 30 dernières analyses
    
    if len(historical_analyses) > 1:
        # Extraire les prix moyens des analyses historiques
        historical_prices = [analysis["analysisData"]["priceAnalysis"]["average"] for analysis in historical_analyses if "analysisData" in analysis and "priceAnalysis" in analysis["analysisData"] and "average" in analysis["analysisData"]["priceAnalysis"]]
        
        if len(historical_prices) > 1:
            # Comparer le prix moyen actuel avec le prix moyen le plus ancien des 30 derniers jours
            current_avg = average_price
            oldest_avg = historical_prices[-1] # Le plus ancien est le dernier car trié par DESC
            
            if oldest_avg > 0:
                kpis["tendancePrix30Jours"] = round(((current_avg - oldest_avg) / oldest_avg) * 100, 2)
            else:
                kpis["tendancePrix30Jours"] = 0.0
        else:
            kpis["tendancePrix30Jours"] = 0.0 # Pas assez de données historiques pour calculer la tendance
    else:
        kpis["tendancePrix30Jours"] = 0.0 # Pas assez de données historiques

    # Élasticité Prix - Simulation
    # Nécessite des données sur la demande en fonction du prix.
    kpis["elasticitePrix"] = "N/A" # À implémenter avec des données de demande/offre réelles

    return kpis

def analyze_market_by_product_name(search_text: str, access_token: str) -> dict:
    """
    Fetches sold items based on a search query from the Vinted API and performs a market analysis.
    """

    # Utilisation de l'endpoint de recherche standard de Vinted
    api_url = "https://www.vinted.fr/api/v2/catalog/items"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'authorization': f'Bearer {access_token}'
    }
    
    # Normalize search_text which may contain the brand
    normalized_search_text = ' '.join([normalize_brand_name(word) for word in search_text.split()])

    # On recherche les articles vendus (is_for_sale=0)
    params = {
        'search_text': normalized_search_text,
        'catalog_ids': '',
        'order': 'relevance',
        'is_for_sale': 0,
        'per_page': 96
    }

    response = None  # Initialiser la variable response
    try:
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json().get("items", [])
    except requests.exceptions.HTTPError as e:
        full_url = response.request.url if response else api_url
        if e.response.status_code == 401:
            raise ConnectionError("Authentication failed. The access token is invalid or has expired.")
        raise ConnectionError(f"HTTP error while accessing Vinted API at {full_url}: {e}")
    except Exception as e:
        raise ConnectionError(f"An error occurred: {e}")

    if not data:
        # Si aucun article n'est trouvé, retourner une structure vide et sauvegarder
        empty_analysis = {
            "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
            "priceAnalysis": {"min": 0, "max": 0, "average": 0, "median": 0},
            "summary": {"itemsFound": 0, "sellersCount": 0},
            "brandDistribution": {},
            "conditionDistribution": {},
            "kpis": {} # Ajouter un champ KPIs vide
        }
        save_analysis(search_text, empty_analysis)
        logger.info(f"Market analysis (no data) saved for: {search_text}")
        return empty_analysis

    records = []
    for item in data:
        try:
            records.append({
                'price': float(item['price']['amount']),
                'brand': item.get('brand_title', 'Non spécifié'),
                'condition': item.get('status', 'Non spécifié'),
                'seller_login': item['user']['login']
            })
        except (KeyError, TypeError, ValueError):
            continue

    if not records:
        empty_analysis_no_records = {
            "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
            "priceAnalysis": {"min": 0, "max": 0, "average": 0, "median": 0},
            "summary": {"itemsFound": 0, "sellersCount": 0},
            "brandDistribution": {},
            "conditionDistribution": {},
            "kpis": {} # Ajouter un champ KPIs vide
        }
        save_analysis(search_text, empty_analysis_no_records)
        logger.info(f"Market analysis (no records) saved for: {search_text}")
        return empty_analysis_no_records
        
    df = pd.DataFrame(records)
    
    price_metrics = {
        "min": float(df["price"].min()),
        "max": float(df["price"].max()),
        "average": round(df["price"].mean(), 2),
        "median": float(df["price"].median())
    }
    
    analysis_summary = {
        "itemsFound": len(df),
        "sellersCount": int(df["seller_login"].nunique())
    }

    # Calcul des KPIs
    calculated_kpis = calculate_kpis(df, search_text)

    # Construire le résultat final
    final_result = {
        "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
        "priceAnalysis": price_metrics,
        "summary": analysis_summary,
        "brandDistribution": df["brand"].value_counts().to_dict(),
        "conditionDistribution": df["condition"].value_counts().to_dict(),
        "kpis": calculated_kpis # Ajouter les KPIs calculés
    }

    logger.info(f"Calculated KPIs: {calculated_kpis}") # Add this log

    # Sauvegarder l'analyse
    save_analysis(search_text, final_result)
    logger.info(f"Market analysis saved for: {search_text}") # Add this log

    return final_result