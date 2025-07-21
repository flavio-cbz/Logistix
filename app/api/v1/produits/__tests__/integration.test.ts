import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE_URL = 'http://localhost:3000/api/v1'; // Utiliser le port 3000 comme indiqué par l'utilisateur

let sessionCookie: string | undefined; // Variable pour stocker le cookie de session

beforeAll(async () => {
  // Se connecter pour obtenir un cookie de session
  const loginRes = await request(API_BASE_URL).post('/auth/login')
    .send({ identifier: 'admin', password: 'admin123' }); // Utiliser les identifiants fournis par l'utilisateur
  
  expect(loginRes.statusCode).toEqual(200);
  expect(loginRes.body.success).toBe(true);

  // Extraire le cookie de session
  const setCookieHeader = loginRes.headers['set-cookie'];
  if (setCookieHeader) {
    const cookiesArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]; // Assurer que c'est un tableau
    const sessionCookieString = cookiesArray.find((cookie: string) => cookie.startsWith('session_id='));
    if (sessionCookieString) {
      sessionCookie = sessionCookieString.split(';')[0]; // Prendre seulement la partie "session_id=..."
    }
  }
  expect(sessionCookie).toBeDefined();
});

afterAll(async () => {
  // Pas besoin de tuer le processus Next.js car il est géré par l'utilisateur
});

describe('Tests d\'intégration pour l\'API /api/v1/produits', () => {
  it('devrait récupérer tous les produits (GET /api/v1/produits)', async () => {
    const res = await request(API_BASE_URL).get('/produits')
      .set('Cookie', sessionCookie as string); // Envoyer le cookie manuellement
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('devrait créer un nouveau produit (POST /api/v1/produits)', async () => {
    const newProduct = {
      nom: 'Test Product', 
      prixArticle: 100,
      prixLivraison: 10,
      poids: 500,
      vendu: true,
      prixVente: 150,
      commandeId: 'CMD-TEST-123'
    };
    const res = await request(API_BASE_URL).post('/produits')
      .set('Cookie', sessionCookie as string) // Envoyer le cookie manuellement
      .send(newProduct);
    expect(res.statusCode).toEqual(201); // Attendre un statut 201 Created
    expect(res.body.produit).toHaveProperty('id');
    expect(res.body.produit.nom).toEqual(newProduct.nom);
    // Calcul du bénéfice attendu: 150 - (100 + 10) = 40
    expect(res.body.produit.benefices).toEqual(40);
  });

  it('devrait mettre à jour un produit existant (PUT /api/v1/produits)', async () => {
    // Créer un produit d'abord pour le mettre à jour
    const productToUpdate = {
      nom: 'Product to Update',
      prixArticle: 100,
      prixLivraison: 10,
      poids: 500,
      commandeId: 'CMD-UPDATE-123'
    };
    const postRes = await request(API_BASE_URL).post('/produits')
      .set('Cookie', sessionCookie as string)
      .send(productToUpdate);
    const productId = postRes.body.produit.id;

    const updatedProduct = {
      id: productId, // Ajouter l'ID pour la requête PUT
      nom: 'Updated Product',
      prixArticle: 120,
      prixLivraison: 15,
      poids: 600,
      vendu: true,
      prixVente: 200,
      commandeId: 'CMD-UPDATED-456'
    };
    const putRes = await request(API_BASE_URL).put(`/produits`)
      .set('Cookie', sessionCookie as string)
      .send(updatedProduct);
    expect(putRes.statusCode).toEqual(200);
    expect(putRes.body.produit.nom).toEqual(updatedProduct.nom);
    // Calcul du bénéfice attendu: 200 - (120 + 15) = 65
    expect(putRes.body.produit.benefices).toEqual(65);
  });

  it('devrait supprimer un produit existant (DELETE /api/v1/produits)', async () => {
    // Créer un produit d'abord pour le supprimer
    const productToDelete = {
      nom: 'Product to Delete',
      prixArticle: 100,
      prixLivraison: 10,
      poids: 500,
      commandeId: 'CMD-DELETE-789'
    };
    const postRes = await request(API_BASE_URL).post('/produits')
      .set('Cookie', sessionCookie as string)
      .send(productToDelete);
    const productId = postRes.body.produit.id;

    const deleteRes = await request(API_BASE_URL).delete(`/produits`)
      .set('Cookie', sessionCookie as string)
      .send({ id: productId }); // Envoyer l'ID dans le corps
      
    expect(deleteRes.statusCode).toEqual(204); // Attendre un statut 204 No Content

    // Vérifier que le produit n'existe plus
    const getRes = await request(API_BASE_URL).get(`/produits?id=${productId}`)
      .set('Cookie', sessionCookie as string);
    expect(getRes.statusCode).toEqual(404); // Not Found
  });
});