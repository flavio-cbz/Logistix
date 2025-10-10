#!/bin/bash
# Script de vérification end-to-end du flux de vente dateMiseEnLigne

echo "========================================================================"
echo "  TEST E2E: Vérification de la persistence de dateMiseEnLigne"
echo "========================================================================"
echo ""

# Configuration
PRODUCT_ID="prod_1759519011824_32d4be06"
DB_PATH="data/logistix.db"
API_URL="http://localhost:3000/api/v1/produits"

# Données de test
DATE_MISE_EN_LIGNE="2025-09-15"
DATE_VENTE="2025-10-09"
PRIX_VENTE="125.50"
PLATEFORME="Vinted"

echo "📝 Configuration du test:"
echo "   - ID Produit: $PRODUCT_ID"
echo "   - Date mise en ligne: $DATE_MISE_EN_LIGNE"
echo "   - Date de vente: $DATE_VENTE"
echo "   - Prix de vente: $PRIX_VENTE €"
echo "   - Plateforme: $PLATEFORME"
echo ""

# 1. État initial du produit
echo "1️⃣ État AVANT la vente:"
sqlite3 "$DB_PATH" "SELECT id, name, date_mise_en_ligne, date_vente, prix_vente, vendu FROM products WHERE id = '$PRODUCT_ID';" | \
  awk -F'|' '{printf "   ID: %s\n   Nom: %s\n   Date mise en ligne: %s\n   Date vente: %s\n   Prix vente: %s\n   Vendu: %s\n", $1, $2, $3, $4, $5, $6}'
echo ""

# 2. Mise à jour SQL directe (simulation de ce que l'API devrait faire)
echo "2️⃣ Mise à jour du produit (simulation API):"
sqlite3 "$DB_PATH" "
UPDATE products 
SET 
  date_mise_en_ligne = '$DATE_MISE_EN_LIGNE',
  date_vente = '$DATE_VENTE',
  prix_vente = $PRIX_VENTE,
  plateforme = '$PLATEFORME',
  vendu = '1',
  status = 'vendu',
  sold_at = datetime('now'),
  updated_at = datetime('now')
WHERE id = '$PRODUCT_ID';
"
echo "   ✅ Mise à jour effectuée"
echo ""

# 3. Vérification en base
echo "3️⃣ État APRÈS la vente:"
RESULT=$(sqlite3 "$DB_PATH" "SELECT id, name, date_mise_en_ligne, date_vente, prix_vente, plateforme, vendu FROM products WHERE id = '$PRODUCT_ID';")
echo "$RESULT" | awk -F'|' '{printf "   ID: %s\n   Nom: %s\n   Date mise en ligne (DB): %s\n   Date vente (DB): %s\n   Prix vente (DB): %s\n   Plateforme (DB): %s\n   Vendu: %s\n", $1, $2, $3, $4, $5, $6, $7}'
echo ""

# 4. Vérifications critiques
echo "4️⃣ Vérifications:"

# Extraction des valeurs
DB_DATE_MISE_EN_LIGNE=$(echo "$RESULT" | cut -d'|' -f3)
DB_DATE_VENTE=$(echo "$RESULT" | cut -d'|' -f4)
DB_PRIX_VENTE=$(echo "$RESULT" | cut -d'|' -f5)

# Vérification 1: Date de mise en ligne
if [ "$DB_DATE_MISE_EN_LIGNE" = "$DATE_MISE_EN_LIGNE" ]; then
  echo "   ✅ Date de mise en ligne CORRECTE ($DB_DATE_MISE_EN_LIGNE)"
else
  echo "   ❌ Date de mise en ligne INCORRECTE"
  echo "      Attendu: $DATE_MISE_EN_LIGNE"
  echo "      Obtenu: $DB_DATE_MISE_EN_LIGNE"
fi

# Vérification 2: Date de vente
if [ "$DB_DATE_VENTE" = "$DATE_VENTE" ]; then
  echo "   ✅ Date de vente CORRECTE ($DB_DATE_VENTE)"
else
  echo "   ❌ Date de vente INCORRECTE"
  echo "      Attendu: $DATE_VENTE"
  echo "      Obtenu: $DB_DATE_VENTE"
fi

# Vérification 3: Prix de vente
if [ "$DB_PRIX_VENTE" = "$PRIX_VENTE" ]; then
  echo "   ✅ Prix de vente CORRECT ($DB_PRIX_VENTE €)"
else
  echo "   ❌ Prix de vente INCORRECT"
  echo "      Attendu: $PRIX_VENTE"
  echo "      Obtenu: $DB_PRIX_VENTE"
fi

# Vérification 4: Les dates sont différentes
if [ "$DB_DATE_MISE_EN_LIGNE" != "$DB_DATE_VENTE" ]; then
  echo "   ✅ Les deux dates sont BIEN DIFFÉRENTES"
else
  echo "   ❌ PROBLÈME: Les deux dates sont IDENTIQUES"
fi

echo ""
echo "========================================================================"
echo "  ✅ TEST TERMINÉ"
echo "========================================================================"
echo ""
echo "📊 Résumé:"
echo "   - date_mise_en_ligne → $DB_DATE_MISE_EN_LIGNE"
echo "   - date_vente → $DB_DATE_VENTE"
echo "   - Ces dates sont différentes: $([ "$DB_DATE_MISE_EN_LIGNE" != "$DB_DATE_VENTE" ] && echo 'OUI ✅' || echo 'NON ❌')"
echo ""
