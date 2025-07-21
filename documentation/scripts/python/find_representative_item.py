import requests
import json
from typing import Optional

def find_representative_item(brand_id: int, catalog_id: int, status_id: int, access_token: str, is_test_mode: bool = False) -> Optional[int]:
    """
    Trouve un item_id représentatif basé sur les critères de recherche.
    Cet item_id sera utilisé pour l'analyse des articles similaires vendus.
    En mode test, retourne un ID factice.
    """
    if is_test_mode:
        print("Mode test activé pour find_representative_item: Retourne un ID factice.")
        return 123456789 # ID factice pour le test

    search_url = "https://www.vinted.fr/api/v2/catalog/items"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'authorization': f'Bearer {access_token}'
    }
    
    params = {
        'brand_id': brand_id,
        'catalog_id': catalog_id,
        'status_id': status_id,
        'per_page': 20,  # Limiter pour obtenir rapidement un échantillon
        'page': 1
    }

    try:
        response = requests.get(search_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        items = data.get("items", [])
        if not items:
            raise ValueError(f"Aucun article trouvé pour les critères: brand_id={brand_id}, catalog_id={catalog_id}, status_id={status_id}")
        
        # Prendre le premier item comme représentatif
        representative_item = items[0]
        return representative_item.get('id')
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise ConnectionError("Authentication failed. The access token is invalid or has expired.")
        else:
            raise ConnectionError(f"HTTP error while searching items: {e}")
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Network error while searching items: {e}")
    except (json.JSONDecodeError, KeyError) as e:
        raise KeyError(f"The search API response is invalid or its structure has changed: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 5:
        print("Usage: python find_representative_item.py <brand_id> <catalog_id> <status_id> <access_token> [is_test_mode]", file=sys.stderr)
        sys.exit(1)
    
    brand_id = int(sys.argv[1])
    catalog_id = int(sys.argv[2])
    status_id = int(sys.argv[3])
    access_token = sys.argv[4]
    is_test_mode = len(sys.argv) > 5 and sys.argv[5].lower() == 'true'

    try:
        item_id = find_representative_item(brand_id, catalog_id, status_id, access_token, is_test_mode)
        print(json.dumps({"item_id": item_id}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)