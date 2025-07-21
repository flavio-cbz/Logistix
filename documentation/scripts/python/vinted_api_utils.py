import requests
import sys
import json

def get_brand_id(brand_title, access_token: str):
    """
    Retrieves the brand ID from Vinted API for a given brand title.
    Requires an access token for authentication.
    """
    url = "https://www.vinted.fr/api/v2/brands"
    headers = {
        'User-Agent': 'YourApp/1.0', # Changé pour correspondre à get_all_brands/catalogs
        'authorization': f'Bearer {access_token}'
    }
    params = {'search_text': brand_title}
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() # Raise an exception for bad status codes
        data = response.json()
        brands = data.get('brands', [])
        if brands:
            return brands[0]['id']
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"Authentication failed for brand search: {e}", file=sys.stderr)
        else:
            print(f"HTTP error for brand search: {e}", file=sys.stderr)
    except requests.exceptions.RequestException as e:
        print(f"Network error for brand search: {e}", file=sys.stderr)
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Invalid API response for brand search: {e}", file=sys.stderr)
    return None

def get_catalog_id(catalog_title, access_token: str):
    """
    Retrieves the catalog ID from Vinted API for a given catalog title.
    Requires an access token for authentication.
    """
    url = "https://www.vinted.fr/api/v2/catalogs"
    headers = {
        'User-Agent': 'YourApp/1.0', # Changé pour correspondre à get_all_brands/catalogs
        'authorization': f'Bearer {access_token}'
    }
    params = {'search_text': catalog_title}
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() # Raise an exception for bad status codes
        data = response.json()
        catalogs = data.get('catalogs', [])
        if catalogs:
            return catalogs[0]['id']
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"Authentication failed for catalog search: {e}", file=sys.stderr)
        else:
            print(f"HTTP error for catalog search: {e}", file=sys.stderr)
    except requests.exceptions.RequestException as e:
        print(f"Network error for catalog search: {e}", file=sys.stderr)
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Invalid API response for catalog search: {e}", file=sys.stderr)
    return None

def get_all_brands(access_token: str) -> list[dict]:
    """
    Retrieves all available brands from the Vinted API.
    """
    url = "https://www.vinted.fr/api/v2/brands"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'User-Agent': 'YourApp/1.0'
    }
    params = {'per_page': 1000}  # Fetch a large number of brands
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        return [{'id': brand['id'], 'title': brand['title']} for brand in data.get('brands', [])]
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        return []

def get_all_catalogs(access_token: str) -> list[dict]:
    """
    Retrieves all available catalogs (categories) from the Vinted API.
    """
    url = "https://www.vinted.fr/api/v2/catalogs"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'User-Agent': 'YourApp/1.0'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return [{'id': catalog['id'], 'title': catalog['title']} for catalog in data.get('catalogs', [])]
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python vinted_api_utils.py <function_name> <access_token>", file=sys.stderr)
        sys.exit(1)

    function_name = sys.argv[1]
    access_token = sys.argv[2]

    if function_name == "get_all_brands":
        result = get_all_brands(access_token)
        print(json.dumps(result))
    elif function_name == "get_all_catalogs":
        result = get_all_catalogs(access_token)
        print(json.dumps(result))
    else:
        print(f"Unknown function: {function_name}", file=sys.stderr)
        sys.exit(1)