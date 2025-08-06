# API Documentation

This document provides comprehensive documentation for the LogistiX API endpoints.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "nom": "John Doe"
    },
    "token": "jwt-token-here"
  }
}
```

#### POST /auth/logout
Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "nom": "John Doe"
    }
  }
}
```

### Parcelles

#### GET /parcelles
Get all parcelles for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "parcelles": [
      {
        "id": "1",
        "nom": "Parcelle Nord",
        "localisation": "Champ Nord",
        "taille": 1000,
        "type": "Légumes"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

#### POST /parcelles
Create a new parcelle.

**Request Body:**
```json
{
  "nom": "Nouvelle Parcelle",
  "localisation": "Champ Sud",
  "taille": 500,
  "type": "Fruits"
}
```

### Produits

#### GET /produits
Get all products for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `parcelle` (optional): Filter by parcelle ID
- `search` (optional): Search by product name

**Response:**
```json
{
  "success": true,
  "data": {
    "produits": [
      {
        "id": "1",
        "nom": "Tomates",
        "prix": 2.50,
        "quantite": 100,
        "parcelle_id": "1"
      }
    ]
  }
}
```

#### POST /produits
Create a new product.

**Request Body:**
```json
{
  "nom": "Nouvelles Tomates",
  "prix": 3.00,
  "quantite": 50,
  "parcelle_id": "1"
}
```

### Market Analysis

#### POST /market-analysis
Perform market analysis for a product.

**Request Body:**
```json
{
  "productName": "Tomates",
  "category": "Légumes",
  "price": 2.50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "averagePrice": 2.75,
      "priceRange": {
        "min": 2.00,
        "max": 3.50
      },
      "recommendations": [
        "Consider increasing price to match market average"
      ]
    }
  }
}
```

### Statistics

#### GET /statistiques
Get comprehensive statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalParcelles": 5,
    "totalProduits": 25,
    "totalVentes": 1500.00,
    "benefices": 750.00
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required or invalid token
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error
- `INVALID_JSON`: Malformed JSON in request body

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## Pagination

List endpoints support pagination with the following parameters:
- `page`: Page number (starts at 1)
- `limit`: Items per page (max 100)

Pagination information is included in the response:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```