# Procédure d’urgence : Authentification Vinted

## Symptômes

- Les appels à l’API Vinted échouent systématiquement (erreur 401 ou 503).
- Le `/api/v1/health` retourne `VINTED_TOKEN_INVALID`.
- Les logs affichent `[VINTED AUTH] Échec du renouvellement automatique du token Vinted.`

## Procédures de résolution

### Environnement de développement

- Vérifier la variable d’environnement `VINTED_TOKEN` :
  - Est-elle présente et correcte dans `.env.local` ?
  - Le token n’est-il pas expiré ?
- Redémarrer le serveur après modification du token.

### Environnement de production

- Le token est stocké dans le gestionnaire de secrets sécurisé (Vault, AWS Secrets Manager, etc.).
- Mettre à jour le secret via l’interface d’administration de l’infrastructure.
- Redémarrer le service concerné si nécessaire.

### Points de contrôle

- Vérifier la santé via `/api/v1/health`.
- Consulter les logs pour toute erreur liée à l’authentification Vinted.
- En cas d’échec persistant, contacter l’équipe technique.

## Sécurité

- Ne jamais exposer le token Vinted dans les logs, tickets ou messages publics.
- Changer le token immédiatement en cas de fuite ou de suspicion de compromission.

---

Documentation générée automatiquement pour la gestion d’incidents liés à l’authentification Vinted.
