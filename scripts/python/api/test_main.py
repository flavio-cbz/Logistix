import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os
import sqlite3
from database import DB_PATH, get_db_connection

# Ajouter le chemin parent pour importer les modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from main import app

@pytest.fixture(scope="session", autouse=True)
def setup_database_session():
    """Ensure the database is clean before running any tests."""
    print("--- Setting up database for test session ---")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'logistix.db')
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = get_db_connection()
    # The get_db_connection should now create the schema correctly.
    print("--- Database setup complete ---")
    yield
    # Teardown can be added here if needed
    print("--- Tearing down database for test session ---")
    conn.close()


client = TestClient(app)

class TestHealthCheck:
    """Tests pour le point de contrôle de santé"""
    
    def test_health_check(self):
        """Test que l'endpoint de santé répond correctement"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "healthy", 
            "message": "Vinted Market Analysis API is running"
        }

class TestAnalyzeEndpoint:
    """Tests pour l'endpoint d'analyse de marché"""
    
    @patch('main.find_representative_item')
    @patch('main.analyze_similar_sold_items')
    def test_analyze_market_success(self, mock_analyze, mock_find_item):
        """Test d'une analyse réussie"""
        # Mocks
        mock_find_item.return_value = 123456
        mock_analyze.return_value = {
            "sourceItemId": 123456,
            "productName": "Test Product",
            "currentPrice": 30.0,
            "minPrice": 10.0,
            "maxPrice": 50.0,
            "avgPrice": 25.0,
            "salesVolume": 100,
            "competitorCount": 8,
            "trend": "stable",
            "trendPercentage": 0.5,
            "lastUpdated": "2024-01-01T12:00:00Z",
            "recommendedPrice": 28.0,
            "marketShare": 15.0,
            "demandLevel": "high",
            "competitors": [{"name": "seller1", "price": 29.0}],
            "summary": {
                "similarSoldItemsFound": 15,
                "competitorCount": 8
            },
            "brandDistribution": {"Nike": 10, "Adidas": 5},
            "conditionDistribution": {"Bon état": 12, "Très bon état": 3}
        }

        # Requête
        request_data = {
            "brand_id": 1,
            "catalog_id": 2,
            "status_id": 6,
            "access_token": "test_token"
        }

        # Ajouter un token JWT valide dans les en-têtes
        # Créer l'utilisateur test et générer le token
        import jwt
        from main import JWT_SECRET
        from database import get_db_connection
        
        # With a clean DB, we must create the user for this test.
        conn = get_db_connection()
        with conn:
            try:
                conn.execute(
                    "INSERT INTO users (id, username, email, hashed_password) VALUES (?, ?, ?, ?)",
                    (1, "test_user", "test@example.com", "fakehash")
                )
            except sqlite3.IntegrityError:
                pass # It might exist if tests are run in parallel or fixture fails
        
        # Générer le token avec le bon user_id
        token = jwt.encode({"id": 1}, JWT_SECRET, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/analyze", json=request_data, headers=headers)
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert "analysis_id" in data
        assert data["message"] == "Analyse de marché sauvegardée avec succès"
        
        # Vérifier que les fonctions ont été appelées
        mock_find_item.assert_called_once_with(1, 2, 6, "test_token")
        mock_analyze.assert_called_once_with(123456, "test_token")
    
    @patch('main.find_representative_item')
    def test_analyze_market_no_representative_item(self, mock_find_item):
        """Test quand aucun article représentatif n'est trouvé"""
        mock_find_item.return_value = None
        
        request_data = {
            "brand_id": 1,
            "catalog_id": 2,
            "status_id": 6,
            "access_token": "test_token"
        }
        
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 404
        assert "Aucun article représentatif trouvé" in response.json()["detail"]
    
    @patch('main.find_representative_item')
    @patch('main.analyze_similar_sold_items')
    def test_analyze_market_connection_error(self, mock_analyze, mock_find_item):
        """Test de gestion d'erreur de connexion (token invalide)"""
        mock_find_item.side_effect = ConnectionError("Authentication failed")
        
        request_data = {
            "brand_id": 1,
            "catalog_id": 2,
            "status_id": 6,
            "access_token": "invalid_token"
        }
        
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 401
        assert "Erreur d'authentification" in response.json()["detail"]
    
    def test_analyze_market_invalid_request(self):
        """Test avec des données de requête invalides"""
        request_data = {
            "brand_id": "invalid",  # Doit être un int
            "catalog_id": 2,
            "status_id": 6,
            "access_token": "test_token"
        }
        
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 422  # Validation error

class TestOtherEndpoints:
    """Tests pour les autres endpoints"""
    
    def test_get_analyses_placeholder(self):
        """Test de l'endpoint de récupération des analyses (placeholder)"""
        # Ajouter un token JWT valide dans les en-têtes
        # Générer un token JWT valide pour les tests
        import jwt
        from main import JWT_SECRET
        token = jwt.encode({"id": 1}, JWT_SECRET, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/analyses", headers=headers)
        assert response.status_code == 200
        # The endpoint is now implemented to return a list
        assert isinstance(response.json(), list)
    
    def test_delete_analysis_placeholder(self):
        """Test de l'endpoint de suppression d'analyse (placeholder)"""
        # Ajouter un token JWT valide dans les en-têtes
        # Générer un token JWT valide pour les tests
        import jwt
        from main import JWT_SECRET
        token = jwt.encode({"id": 1}, JWT_SECRET, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        # We need to create an analysis to delete it
        conn = get_db_connection()
        with conn:
            # Insert a dummy analysis that matches the full schema
            conn.execute("""
                INSERT INTO market_analyses (
                    id, user_id, product_name, current_price, min_price, max_price, avg_price,
                    sales_volume, competitor_count, trend, trend_percentage, last_updated,
                    recommended_price, market_share, demand_level, competitors, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test_id_to_delete", 1, "Test Product", 0, 0, 0, 0, 0, 0, "", 0, "2024-01-01", 0, 0, "", "[]", "2024-01-01", "2024-01-01"
            ))

        response = client.delete("/api/analyses/test_id_to_delete", headers=headers)
        assert response.status_code == 200
        assert "test_id_to_delete" in response.json()["message"]

# Tests unitaires pour les fonctions utilitaires
class TestUtilityFunctions:
    """Tests unitaires pour les fonctions des modules importés"""
    
    @patch('requests.get')
    def test_find_representative_item_success(self, mock_get):
        """Test de la fonction find_representative_item"""
        from find_representative_item import find_representative_item
        
        # Mock de la réponse API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "items": [{"id": 123456}, {"id": 789012}]
        }
        mock_get.return_value = mock_response
        
        result = find_representative_item(1, 2, 6, "test_token")
        assert result == 123456
        
        # Vérifier l'appel API
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert "brand_id" in call_args[1]["params"]
        assert call_args[1]["params"]["brand_id"] == 1
    
    @patch('requests.get')
    def test_analyze_similar_sold_items_success(self, mock_get):
        """Test de la fonction analyze_similar_sold_items"""
        from analyze_similar_sold_items import analyze_similar_sold_items
        
        # Mock de la réponse API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "items": [
                {
                    "price": {"amount": "25.00"},
                    "brand_title": "Nike",
                    "status": "Bon état",
                    "user": {"login": "user1"}
                },
                {
                    "price": {"amount": "30.00"},
                    "brand_title": "Nike",
                    "status": "Très bon état",
                    "user": {"login": "user2"}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = analyze_similar_sold_items(123456, "test_token")
        
        assert "priceAnalysis" in result
        assert "summary" in result
        assert result["sourceItemId"] == 123456
        assert result["summary"]["similarSoldItemsFound"] == 2

if __name__ == "__main__":
    pytest.main([__file__])