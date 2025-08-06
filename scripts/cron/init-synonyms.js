// Script d’initialisation des synonymes Vinted (V1 : français)
// À exécuter une fois après migration du schéma

const { db } = require('../../lib/services/db');
const { v4: uuidv4 } = require('uuid');

// Synonymes à insérer (exemples, à compléter selon le besoin)
const synonyms = [
  // Marques
  { entity_type: 'brand', canonical_id: 'ID_RALPH_LAUREN', synonym: 'RL', language: 'fr' },
  { entity_type: 'brand', canonical_id: 'ID_RALPH_LAUREN', synonym: 'Ralph Lauren', language: 'fr' },
  { entity_type: 'brand', canonical_id: 'ID_NIKE', synonym: 'Nike', language: 'fr' },
  { entity_type: 'brand', canonical_id: 'ID_NIKE', synonym: 'Nikey', language: 'fr' },
  // Couleurs
  { entity_type: 'color', canonical_id: 'ID_BLEU', synonym: 'bleu', language: 'fr' },
  { entity_type: 'color', canonical_id: 'ID_BLEU', synonym: 'bleue', language: 'fr' },
  { entity_type: 'color', canonical_id: 'ID_BLEU', synonym: 'blue', language: 'fr' },
  { entity_type: 'color', canonical_id: 'ID_ROUGE', synonym: 'rouge', language: 'fr' },
  // Matières
  { entity_type: 'material', canonical_id: 'ID_LIN', synonym: 'lin', language: 'fr' },
  { entity_type: 'material', canonical_id: 'ID_COTON', synonym: 'coton', language: 'fr' },
];

function insertSynonyms() {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO vinted_synonyms (id, entity_type, canonical_id, synonym, language)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const s of synonyms) {
    stmt.run(uuidv4(), s.entity_type, s.canonical_id, s.synonym, s.language);
  }
  console.log('Synonymes insérés avec succès.');
}

insertSynonyms();
process.exit(0);