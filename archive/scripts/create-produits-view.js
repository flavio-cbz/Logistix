const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'logistix.db');
const db = new Database(dbPath);

const sql = `
DROP VIEW IF EXISTS produits;
CREATE VIEW produits AS
SELECT
  id,
  user_id,
  parcelle_id AS parcelleId,
  name AS nom,
  price AS prixArticle,
  price AS prixArticleTTC,
  cout_livraison AS prixLivraison,
  COALESCE(prix_vente, selling_price) AS prixVente,
  poids,
  vendu,
  date_mise_en_ligne AS tempsEnLigne,
  created_at,
  updated_at,
  plateforme,
  vinted_item_id,
  photo_url
FROM products;
`;

try {
  db.exec(sql);
  console.log('View produits created or replaced successfully');
} catch (e) {
  console.error('Failed to create view produits:', e.message);
  process.exit(1);
} finally {
  db.close();
}
