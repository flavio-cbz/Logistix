# Fiche Règle 03 : Conventions API Backend (Next.js App Router)

## Objectif

Uniformiser la structure, la validation, les réponses et la gestion d'erreurs pour les endpoints API afin d'améliorer la maintenabilité et la sécurité.

## Contexte

- Les routes API utilisent le répertoire `app/api/` (App Router). Confirmer si des endpoints legacy en `pages/api/` existent.

## Structure conseillée

- pattern : `app/api/<resource>/route.ts` → export `GET/POST/PUT/DELETE` handlers.
- Séparer la logique :

  - `handlers/` ou `app/api/<resource>/route.ts` : adaptation requête → service
  - `lib/services/<resource>.ts` : logique métier et accès DB
  - `lib/schemas/<resource>.ts` : schémas de validation (Zod)

## Validation d'entrée

- Utiliser Zod pour tous les payloads et paramètres.
- Exemple :

```ts
import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().min(3),
  price: z.number().nonnegative(),
  tags: z.array(z.string()).optional(),
});

export type CreateProduct = z.infer<typeof createProductSchema>;
```

## Format de réponse

- Normaliser la réponse :

  - Succès : `{ "ok": true, "data": ... }`
  - Erreur : `{ "ok": false, "error": { "code": "BAD_REQUEST", "message": "...", "details": {...?} } }`

- Toujours renvoyer des codes HTTP corrects (200, 201, 204, 400, 401, 403, 404, 422, 500).

## Gestion des erreurs

- Centraliser la transformation des erreurs applicatives en responses HTTP.
- Exemple simple d'`ApiError` :

```ts
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

- Middleware / utilitaire pour mapper erreurs en response :

```ts
export function toApiResponse(err: unknown) {
  if (err instanceof ApiError) {
    return { status: err.statusCode, body: { ok: false, error: { code: err.code, message: err.message } } };
  }
  return { status: 500, body: { ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } } };
}
```

## Authentification & Autorisation

- Par défaut, utiliser l'auth existante du projet (Supabase Auth si configuré). Si non, documenter le fallback (JWT, cookie session).
- Vérifier l'auth dans le handler avant d'appeler les services.

## Sécurité

- Valider et sanitizer toutes les entrées (Zod + types).
- Limiter les tailles de payloads.
- Protéger endpoints sensibles avec RLS / policies côté DB lorsque possible.
- Implémenter un rate-limit minimal pour endpoints publics si nécessaire.

## Logging & Monitoring

- Logger les erreurs avec contexte minimal (userId, route, payload hash) sans exposer de secrets.
- Ajouter metrics (latence, taux d'erreur) pour endpoints critiques.

## Tests

- Écrire tests unitaires pour services et tests d'intégration (supertest / next-test-utils) pour endpoints critiques.
- Exemple de test d'intégration minimal (pseudo) :

```ts
// tests/api/product.test.ts
import request from 'supertest';
import app from '../../app/server';

describe('POST /api/product', () => {
  it('creates product', async () => {
    const res = await request(app).post('/api/product').send({ title: 'x', price: 1 });
    expect(res.status).toBe(201);
  });
});
```

## Exemples et snippets (référence)

- `lib/schemas/product.ts` : Zod schema
- `lib/services/product.ts` : fonctions d'accès DB
- `app/api/product/route.ts` : handler expressif

---

Points à vérifier : existe-t-il une convention déjà en place pour les classes `ApiError` et les middlewares ? Si oui, je peux générer un modèle réutilisable.
