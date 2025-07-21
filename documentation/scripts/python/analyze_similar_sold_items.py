import requests
import pandas as pd
import json
import re
from datetime import datetime, timezone
import random
from typing import Optional

def parse_second_line(text: str) -> str:
    """
    Extracts the second line from a multi-line string.
    Returns an empty string if there is no second line.
    """
    if not text or not isinstance(text, str):
        return ""
    lines = text.strip().split('\n')
    return lines[1].strip() if len(lines) > 1 else ""

def analyze_similar_sold_items(brand_id: int, catalog_id: int, status_id: int, access_token: str, is_test_mode: bool = False) -> dict:
    """
    Fetches similar sold items for given brand_id, catalog_id, and status_id from the Vinted API,
    and performs a market analysis on them.
    En mode test, retourne des données factices.
    """
    if is_test_mode:
        print("Mode test activé pour analyze_similar_sold_items: Retourne des données factices.")
        # Données de test pour simuler une réponse réussie
        return {
            "sourceItemId": 123456789, # Un ID factice
            "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
            "priceAnalysis": {
                "min": 10.0,
                "max": 50.0,
                "average": 30.0,
                "median": 25.0
            },
            "summary": {
                "similarSoldItemsFound": 100,
                "competitorCount": 50
            },
            "brandDistribution": {
                "Dyson": 70,
                "Philips": 20,
                "Babyliss": 10
            },
            "conditionDistribution": {
                "new_with_tags": 20,
                "like_new": 60,
                "good": 20
            }
        }


    api_url = "https://www.vinted.fr/api/v2/item_upload/items/similar_sold_items" # Nouvelle URL
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'authorization': f'Bearer {access_token}'
    }
    
    params = {
        'brand_id': brand_id,
        'catalog_id': catalog_id,
        'status_id': status_id,
        'per_page': 96 # Max items per page
    }

    try:
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json().get("items", [])
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise ConnectionError("Authentication failed. The access token is invalid or has expired.")
        else:
            raise ConnectionError(f"HTTP error while accessing Vinted API: {e}")
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Network error while accessing Vinted API: {e}")
    except (json.JSONDecodeError, KeyError) as e:
        raise KeyError(f"The API response is invalid or its structure has changed: {e}")

    if not data:
        # Si aucun article n'est trouvé, retourner une structure de réponse vide mais valide.
        return {
            "sourceItemId": None,
            "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
            "priceAnalysis": {"min": 0, "max": 0, "average": 0, "median": 0},
            "summary": {"similarSoldItemsFound": 0, "competitorCount": 0},
            "brandDistribution": {},
            "conditionDistribution": {}
        }

    records = []
    for item in data:
        try:
            records.append({
                'price': float(item['price']['amount']),
                'brand': item.get('brand_title', 'Not specified'),
                'condition': item.get('status', 'Not specified'),
                'seller_login': item['user']['login']
            })
        except (KeyError, TypeError, ValueError):
            continue

    if not records:
        # Si aucun enregistrement valide n'a pu être traité, retourner une structure vide.
        return {
            "sourceItemId": None,
            "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
            "priceAnalysis": {"min": 0, "max": 0, "average": 0, "median": 0},
            "summary": {"similarSoldItemsFound": 0, "competitorCount": 0},
            "brandDistribution": {},
            "conditionDistribution": {}
        }
        
    df = pd.DataFrame(records)
    
    price_metrics = {
        "min": float(df["price"].min()),
        "max": float(df["price"].max()),
        "average": round(df["price"].mean(), 2),
        "median": float(df["price"].median())
    }
    
    analysis_summary = {
        "similarSoldItemsFound": len(df),
        "competitorCount": int(df["seller_login"].nunique())
    }

    return {
        "sourceItemId": None, # Corrigé : item_id n'est pas défini ici.
        "analysisTimestamp": datetime.now(timezone.utc).isoformat(),
        "priceAnalysis": price_metrics,
        "summary": analysis_summary,
        "brandDistribution": df["brand"].value_counts().to_dict(),
        "conditionDistribution": df["condition"].value_counts().to_dict()
    }