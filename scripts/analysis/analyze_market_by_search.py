import logging
logging.basicConfig(level=logging.DEBUG)
import requests
import pandas as pd
import json
import sys
from datetime import datetime, timezone
from typing import Optional

def search_vinted_items(access_token: str, brand_id: Optional[int], catalog_id: Optional[int], status_id: int, page_limit: int = 3) -> dict:
    """
    Recherche des articles sur Vinted par marque, catégorie et statut,
    puis analyse les articles vendus pour créer une analyse de marché.
    """
    base_url = "https://www.vinted.fr/api/v2/catalog/items"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'authorization': f'Bearer {access_token}'
    }
    
    all_items = []
    
    # Récupérer plusieurs pages pour avoir plus de données
    for page in range(1, page_limit + 1):
        params = {
            'status_ids': status_id,
            'per_page': 96,
            'page': page
        }
        if catalog_id is not None:
            params['catalog_ids'] = catalog_id
        if brand_id is not None:
            params['brand_ids'] = brand_id
        
        try:
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            items = data.get("items", [])
            
            if not items:
                break
                
            all_items.extend(items)
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise ConnectionError("Authentication failed. The access token is invalid or has expired.")
            else:
                raise ConnectionError(f"HTTP error while accessing Vinted API: {e}")
        except requests.exceptions.RequestException as e:
            raise ConnectionError(f"Network error while accessing Vinted API: {e}")
        except (json.JSONDecodeError, KeyError) as e:
            raise KeyError(f"The API response is invalid or its structure has changed: {e}")
    
    if not all_items:
        raise ValueError(f"No items found for brand_id: {brand_id}, catalog_id: {catalog_id}, status_id: {status_id}")
    
    # Séparer les articles vendus et non vendus
    sold_items = [item for item in all_items if item.get('is_sold')]
    available_items = [item for item in all_items if not item.get('is_sold')]
    
    if not sold_items:
        # Si pas d'articles vendus, créer une analyse basée sur les articles disponibles
        return analyze_available_items(available_items, brand_id, catalog_id, status_id)
    
    return analyze_sold_items(sold_items, available_items, brand_id, catalog_id, status_id)

def analyze_sold_items(sold_items: list, available_items: list, brand_id: int, catalog_id: int, status_id: int) -> dict:
    """Analyse les articles vendus pour créer des métriques de marché"""
    
    sold_records = []
    for item in sold_items:
        try:
            sold_records.append({
                'id': item['id'],
                'title': item.get('title', ''),
                'price': float(item['price']['amount']),
                'total_price_with_fees': float(item.get('total_item_price_with_fees', {}).get('amount', 0)),
                'brand': item.get('brand_title', 'Non spécifié'),
                'size': item.get('size_title', 'Non spécifié'),
                'condition': item.get('status', 'Non spécifié'),
                'photoUrl': item.get('photos', [{}])[0].get('url', '') if item.get('photos') else ''
            })
        except (KeyError, TypeError, ValueError):
            continue
    
    if not sold_records:
        raise ValueError("No valid sold items could be processed from the API response.")
    
    df_sold = pd.DataFrame(sold_records)
    
    # Analyse des prix
    price_analysis = {
        "min": float(df_sold["price"].min()),
        "max": float(df_sold["price"].max()),
        "average": round(df_sold["price"].mean(), 2),
        "median": float(df_sold["price"].median())
    }
    
    # Métriques du marché
    summary = {
        "similarSoldItemsFound": len(df_sold),
        "competitorCount": len(set(item.get('user', {}).get('login', '') for item in sold_items if item.get('user', {}).get('login'))),
        "availableItemsCount": len(available_items)
    }
    
    # Métadonnées de recherche
    search_meta = {
        "title": f"Analyse {brand_id}/{catalog_id}/{status_id}",
        "brandId": brand_id,
        "catalogId": catalog_id,
        "statusId": status_id,
        "searchTimestamp": datetime.now(timezone.utc).isoformat()
    }
    
    return {
        "searchMeta": search_meta,
        "priceAnalysis": price_analysis,
        "summary": summary,
        "soldItems": sold_records,
        "brandDistribution": df_sold["brand"].value_counts().to_dict(),
        "conditionDistribution": df_sold["condition"].value_counts().to_dict(),
        "sizeDistribution": df_sold["size"].value_counts().to_dict()
    }

def analyze_available_items(available_items: list, brand_id: int, catalog_id: int, status_id: int) -> dict:
    """Analyse les articles disponibles quand il n'y a pas d'articles vendus"""
    
    available_records = []
    for item in available_items:
        try:
            available_records.append({
                'id': item['id'],
                'title': item.get('title', ''),
                'price': float(item['price']['amount']),
                'total_price_with_fees': float(item.get('total_item_price_with_fees', {}).get('amount', 0)),
                'brand': item.get('brand_title', 'Non spécifié'),
                'size': item.get('size_title', 'Non spécifié'),
                'condition': item.get('status', 'Non spécifié'),
                'photoUrl': item.get('photos', [{}])[0].get('url', '') if item.get('photos') else ''
            })
        except (KeyError, TypeError, ValueError):
            continue
    
    if not available_records:
        raise ValueError("No valid available items could be processed from the API response.")
    
    df_available = pd.DataFrame(available_records)
    
    # Analyse des prix basée sur les articles disponibles
    price_analysis = {
        "min": float(df_available["price"].min()),
        "max": float(df_available["price"].max()),
        "average": round(df_available["price"].mean(), 2),
        "median": float(df_available["price"].median())
    }
    
    # Métriques du marché
    summary = {
        "similarSoldItemsFound": 0,  # Pas d'articles vendus trouvés
        "competitorCount": len(set(item.get('user', {}).get('login', '') for item in available_items if item.get('user', {}).get('login'))),
        "availableItemsCount": len(available_items)
    }
    
    # Métadonnées de recherche
    search_meta = {
        "title": f"Analyse {brand_id}/{catalog_id}/{status_id}",
        "brandId": brand_id,
        "catalogId": catalog_id,
        "statusId": status_id,
        "searchTimestamp": datetime.now(timezone.utc).isoformat()
    }
    
    return {
        "searchMeta": search_meta,
        "priceAnalysis": price_analysis,
        "summary": summary,
        "soldItems": [],  # Pas d'articles vendus
        "availableItems": available_records,  # Inclure les articles disponibles
        "brandDistribution": df_available["brand"].value_counts().to_dict(),
        "conditionDistribution": df_available["condition"].value_counts().to_dict(),
        "sizeDistribution": df_available["size"].value_counts().to_dict()
    }

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(json.dumps({"error": "Usage: python analyze_market_by_search.py <access_token> <brand_id> <catalog_id> <status_id>"}))
        sys.exit(1)
    
    try:
        access_token = sys.argv[1]
        brand_id = int(sys.argv[2]) if sys.argv[2] != 'None' else None
        catalog_id = int(sys.argv[3]) if sys.argv[3] != 'None' else None
        status_id = int(sys.argv[4])
        
        result = search_vinted_items(access_token, brand_id, catalog_id, status_id)
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)