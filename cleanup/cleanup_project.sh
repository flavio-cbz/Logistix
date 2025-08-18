#!/usr/bin/env bash
set -euo pipefail

# cleanup/cleanup_project.sh
# Automatisation de nettoyage préparatoire selon feedback utilisateur.
# Idempotent et sécurisé : ne supprime jamais un fichier absent, évite doublons TODO,
# met à jour .gitignore et retire les fichiers suivis de l'index git.
# Nouveau : détection automatisée et suppression des fichiers "orphelins".
#
# Usage:
#   bash cleanup/cleanup_project.sh
#
# Le script crée (ou se positionne sur) la branche git "cleanup-files".

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)"
cd "$REPO_ROOT"

echo "Début du cleanup dans : $REPO_ROOT"

BRANCH="cleanup-files"

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Branche '$BRANCH' existante -- checkout."
  git checkout "$BRANCH"
else
  echo "Création et checkout de la branche '$BRANCH'."
  git checkout -b "$BRANCH"
fi

# --- Définition des catégories (modifiable) ---
CATEGORY1=(
  "scripts/cleanup-demo-and-temp-files.ts"
  "scripts/cleanup-old-logs.js"
  "scripts/cleanup-cache-temp.js"
  "scripts/analysis/find_representative_item.py"
  "scripts/analysis/vinted_api_utils.py"
)

CATEGORY2=(
  "scripts/analyze-and-organize-scripts.ts"
  "scripts/maintenance/fetch-vinted-catalogs.js"
  "lib/services/validation/debug-logger-demo.ts"
)

CATEGORY3=(
  "data/logistix.db"
  "test-results/"
)

CATEGORY4=(
  "scripts/setup-env.js"
  "scripts/setup-db.js"
)

# --- Nouveaux paramètres pour détection orphelins ---
# Extensions à analyser comme sources candidates
ORPHAN_EXTS=( "ts" "tsx" "js" "jsx" "py" "css" "scss" "sh" "md" "json" "yml" "yaml" "html" )
# Répertoires à exclure absolument
EXCLUDE_DIRS=( "node_modules" ".git" ".next" "dist" "public" "test-results" "data" "backup-*" )
# Fichiers protégés à ne jamais supprimer (noms de base)
PROTECTED_BASENAMES=( "index.ts" "index.js" "README.md" "package.json" "tsconfig.json" "package-lock.json" "pnpm-lock.yaml" "yarn.lock" "next.config.js" )

# Compteurs pour le résumé
removed=0
skipped=0
todo_added=0
gitignore_added=0
git_rm_cached=0
orphan_removed=0
orphan_list=()

echo ""
echo "Traitement : catégorie 1 (suppression quasi-certaine)"
for f in "${CATEGORY1[@]}"; do
  if [ -e "$f" ]; then
    echo " - Trouvé : $f"
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git rm -f -- "$f"
      echo "   -> git rm (suivi) : $f"
    else
      rm -f -- "$f"
      echo "   -> rm (non suivi) : $f"
    fi
    removed=$((removed+1))
  else
    echo " - Absent, passage : $f"
    skipped=$((skipped+1))
  fi
done

echo ""
echo "Traitement : catégorie 2 (ajout de TODO commentés pour guider fusion/migration)"
for f in "${CATEGORY2[@]}"; do
  if [ -e "$f" ]; then
    case "$f" in
      *.sh|*.bash) prefix="#";;
      *.py) prefix="#";;
      *.md) prefix="<!--";;
      *.ts|*.js|*.tsx|*.jsx) prefix="//";;
      *) prefix="//";;
    esac

    if [ "$prefix" = "<!--" ]; then
      todo="<!-- TODO [CLEANUP] : fusionner/migrer le contenu de $f selon l'analyse ; NE PAS SUPPRIMER automatiquement -->"
    else
      todo="$prefix TODO [CLEANUP] : fusionner/migrer le contenu de $f selon l'analyse ; NE PAS SUPPRIMER automatiquement"
    fi

    if grep -F -q "TODO [CLEANUP]" "$f"; then
      echo " - TODO déjà présent dans : $f (skip)"
    else
      tmp="$(mktemp)"
      umask_orig="$(umask)"
      printf "%s\n\n" "$todo" > "$tmp"
      cat "$f" >> "$tmp"
      mv "$tmp" "$f"
      umask "$umask_orig"
      echo " - TODO ajouté à : $f"
      todo_added=$((todo_added+1))
    fi
  else
    echo " - Fichier absent, skip : $f"
    skipped=$((skipped+1))
  fi
done

echo ""
echo "Traitement : catégorie 3 (ajout au .gitignore et retrait de l'index git si suivi)"
GITIGNORE=".gitignore"
touch "$GITIGNORE"
for entry in "${CATEGORY3[@]}"; do
  if grep -Fxq "$entry" "$GITIGNORE"; then
    echo " - $entry déjà présent dans $GITIGNORE"
  else
    echo "$entry" >> "$GITIGNORE"
    echo " - Ajouté $entry à $GITIGNORE"
    gitignore_added=$((gitignore_added+1))
  fi

  if git ls-files --error-unmatch "$entry" >/dev/null 2>&1; then
    git rm -r --cached -- "$entry" || true
    echo "   -> retiré de l'index git : $entry"
    git_rm_cached=$((git_rm_cached+1))
  else
    if [ -d "$entry" ]; then
      tracked_count=$(git ls-files "$entry" | wc -l | tr -d ' ')
      if [ "$tracked_count" -gt 0 ]; then
        git rm -r --cached -- "$entry" || true
        echo "   -> retiré de l'index git (dir) : $entry"
        git_rm_cached=$((git_rm_cached+tracked_count))
      else
        echo "   -> Aucun fichier suivi dans : $entry"
      fi
    else
      echo "   -> $entry non suivi par git"
    fi
  fi
done

echo ""
echo "Catégorie 4 (scripts fantômes) — aucune suppression effectuée, avertissements :"
for f in "${CATEGORY4[@]}"; do
  echo " - [ATTENTION] Script fantôme détecté (ne pas supprimer automatiquement) : $f"
done

# --- Détection et suppression des fichiers orphelins ---
echo ""
echo "Détection des fichiers orphelins (peut prendre un moment)..."

# Build find -path exclude clauses
find_excludes=()
for d in "${EXCLUDE_DIRS[@]}"; do
  find_excludes+=( -not -path "./$d/*" )
done

# Build -name clauses for extensions
name_clauses=()
for ext in "${ORPHAN_EXTS[@]}"; do
  name_clauses+=( -o -name "*.${ext}" )
done
# Remove leading -o from first clause when used

# Execute find to list candidates
# Note: we use printf to construct command safely
eval "candidates=\$(find . -type f ${find_excludes[*]} \\( ${name_clauses[*]:1} \\) -print)"

# Iterate candidates
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # Normalize path without leading ./
  f_rel="${f#./}"
  # Skip files in repo root that are protected
  base="$(basename "$f_rel")"
  skip=false
  for p in "${PROTECTED_BASENAMES[@]}"; do
    if [ "$base" = "$p" ]; then
      skip=true
      break
    fi
  done
  if [ "$skip" = true ]; then
    # Do not consider protected files
    continue
  fi

  # Also never remove files named README.md anywhere
  if [ "$base" = "README.md" ]; then
    continue
  fi

  # Prepare search patterns: full filename and basename without extension
  name="$base"
  name_no_ext="${base%.*}"

  # Search for references across the repository excluding specified dirs and excluding matches in *.md, *.json, *.lock
  # We exclude the file itself from results.
  # Use grep -I to ignore binary files, -R for recursive, -n for line numbers
  grep_excludes=( )
  for d in "${EXCLUDE_DIRS[@]}"; do
    grep_excludes+=( --exclude-dir="$d" )
  done
  # Exclude file types from counting as references
  exclude_filetypes=( --exclude="*.md" --exclude="*.json" --exclude="*.lock" )

  # Build grep command
  # Search for 'name' and 'name_no_ext' as plain strings; also search for occurrences like './path/to/name' (partial)
  refs=$(grep -RIn "${grep_excludes[@]}" "${exclude_filetypes[@]}" -e "$name" -e "$name_no_ext" . || true)

  # Filter out lines that are the file itself
  refs_filtered=$(echo "$refs" | grep -v "^./$f_rel:" || true)

  if [ -z "$refs_filtered" ]; then
    # No references found -> consider orphan
    echo " - Orphelin détecté : $f_rel"
    if git ls-files --error-unmatch "$f_rel" >/dev/null 2>&1; then
      git rm -f -- "$f_rel"
      echo "   -> git rm (suivi) : $f_rel"
    else
      rm -f -- "$f_rel"
      echo "   -> rm (non suivi) : $f_rel"
    fi
    orphan_removed=$((orphan_removed+1))
    orphan_list+=( "$f_rel" )
  else
    # Reference(s) found -> skip deletion
    # Optional: can print a short trace for debugging
    # echo "   -> Références trouvées, skip : $f_rel"
    :
  fi
done <<EOF
$candidates
EOF

# Résumé
echo ""
echo "=== RÉSUMÉ D'EXÉCUTION ==="
echo "Fichiers supprimés (catégorie1): $removed"
echo "Orphelins supprimés: $orphan_removed"
if [ "$orphan_removed" -gt 0 ]; then
  echo ""
  echo "Liste des orphelins supprimés :"
  for x in "${orphan_list[@]}"; do
    echo " - $x"
  done
fi
echo "TODOs ajoutés: $todo_added"
echo ".gitignore ajouts: $gitignore_added"
echo "Entrées retirées de l'index git: $git_rm_cached"
echo "Fichiers absents/skippés: $skipped"
echo ""
echo "Si le résultat est satisfaisant, commitez les changements :"
echo "  git add .gitignore && git add -A && git commit -m \"cleanup: remove stale files and add TODOs\" || true"
echo "Fin du script."