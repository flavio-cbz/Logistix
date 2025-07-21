import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os
import sqlite3

# Ajouter le chemin parent pour importer les modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.main import app
from api.config import JWT_SECRET
from api.database import get_db_connection, DB_PATH
from api.dependencies import get_current_user
from api.main import User

# Surcharger la dépendance d'authentification pour les tests
def override_get_current_user():
    return User(id=1, username="test_user", email="test@example.com")

app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture(scope="session", autouse=True)
def setup_database_session():
    """Ensure the database is clean before running any tests."""
    print("--- Setting up database for test session ---")
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = get_db_connection()
    with conn:
        try:
            conn.execute(
                "INSERT INTO users (id, username, email, hashed_password) VALUES (?, ?, ?, ?)",
                (1, "test_user", "test@example.com", "fakehash")
            )
        except sqlite3.IntegrityError:
            pass
    print("--- Database setup complete ---")
    yield
    print("--- Tearing down database for test session ---")
    conn.close()
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


client = TestClient(app)

class TestHealthCheck:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

class TestAnalyzeEndpoint:
    @patch('api.main.find_representative_item')
    @patch('api.main.analyze_similar_sold_items')
    def test_analyze_market_success(self, mock_analyze, mock_find_item):
        mock_find_item.return_value = 123456
        mock_analyze.return_value = {"productName": "Test Product"}
        request_data = {"brand_id": 1, "catalog_id": 2, "status_id": 6, "access_token": "test_token"}
        
        response = client.post("/api/analyze", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "analysis_id" in data
        assert data["message"] == "Analyse de marché sauvegardée avec succès"
        mock_find_item.assert_called_once_with(1, 2, 6, "test_token")
        mock_analyze.assert_called_once_with(123456, "test_token")
    
    @patch('api.main.find_representative_item')
    def test_analyze_market_no_representative_item(self, mock_find_item):
        mock_find_item.return_value = None
        request_data = {"brand_id": 1, "catalog_id": 2, "status_id": 6, "access_token": "test_token"}
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 404
    
    @patch('api.main.find_representative_item')
    def test_analyze_market_connection_error(self, mock_find_item):
        mock_find_item.side_effect = ConnectionError("Authentication failed")
        request_data = {"brand_id": 1, "catalog_id": 2, "status_id": 6, "access_token": "invalid_token"}
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 401

    def test_analyze_market_invalid_request(self):
        request_data = {"brand_id": "invalid", "catalog_id": 2, "status_id": 6, "access_token": "test_token"}
        response = client.post("/api/analyze", json=request_data)
        assert response.status_code == 422

class TestOtherEndpoints:
    def test_get_analyses_placeholder(self):
        response = client.get("/api/analyses")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_delete_analysis_placeholder(self):
        response = client.delete("/api/analyses/test_id_to_delete")
        assert response.status_code == 200

class TestUtilityFunctions:
    @patch('requests.get')
    def test_find_representative_item_success(self, mock_get):
        from find_representative_item import find_representative_item
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"items": [{"id": 123456}]}
        mock_get.return_value = mock_response
        result = find_representative_item(1, 2, 6, "test_token")
        assert result == 123456
    
    @patch('requests.get')
    def test_analyze_similar_sold_items_success(self, mock_get):
        from analyze_similar_sold_items import analyze_similar_sold_items
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"items": [{"price": {"amount": "25.00"}, "brand_title": "Nike", "status": "Bon état", "user": {"login": "user1"}}]}
        mock_get.return_value = mock_response
        result = analyze_similar_sold_items(1, 2, 6, "test_token")
        assert "priceAnalysis" in result

if __name__ == "__main__":
    pytest.main([__file__])