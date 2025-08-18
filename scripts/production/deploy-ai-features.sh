#!/bin/bash

# Script de Déploiement Simplifié pour les Fonctionnalités AI
# Ce script se contente des tâches essentielles qui ne peuvent pas être faites via l'interface d'administration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation de base
validate_environment() {
    log_info "Validation de l'environnement de déploiement..."
    
    # Vérifier la variable d'environnement requise
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "Variable d'environnement DATABASE_URL requise"
        return 1
    fi
    
    # Tester la connectivité à la base de données
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Impossible de se connecter à la base de données"
        return 1
    fi
    
    log_success "Validation de l'environnement réussie"
}

# Déploiement des changements de base de données
deploy_database_schema() {
    log_info "Déploiement du schéma de base de données pour l'AI..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Création des tables AI"
        return 0
    fi
    
    # Créer les tables nécessaires pour l'AI
    psql "$DATABASE_URL" -c "
    -- Table pour les paramètres AI (gérés via l'interface d'administration)
    CREATE TABLE IF NOT EXISTS ai_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        settings JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row CHECK (id = 1)
    );
    
    -- Table pour les métriques AI
    CREATE TABLE IF NOT EXISTS ai_analysis_metrics (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        processing_time INTEGER NOT NULL,
        tokens_used INTEGER NOT NULL,
        estimated_cost DECIMAL(10,4) NOT NULL,
        confidence_score DECIMAL(3,2),
        success BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Index pour les performances
    CREATE INDEX IF NOT EXISTS idx_ai_metrics_created_at 
    ON ai_analysis_metrics(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_ai_metrics_service 
    ON ai_analysis_metrics(service_name);
    
    -- Table pour l'audit des changements de configuration
    CREATE TABLE IF NOT EXISTS ai_settings_audit (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        old_settings JSONB,
        new_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW()
    );
    "
    
    log_success "Schéma de base de données AI déployé"
}

# Déploiement de l'application
deploy_application() {
    log_info "Déploiement de l'application avec les fonctionnalités AI..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Déploiement de l'application"
        return 0
    fi
    
    # Build de l'application
    npm run build
    
    # Utiliser le script de déploiement existant s'il existe
    if [[ -f "$PROJECT_ROOT/scripts/deploy.sh" ]]; then
        "$PROJECT_ROOT/scripts/deploy.sh"
    else
        log_warning "Aucun script de déploiement existant trouvé"
        # Redémarrer les services manuellement
        pm2 restart all || systemctl restart logistix || log_warning "Impossible de redémarrer les services"
    fi
    
    log_success "Application déployée"
}

# Vérification post-déploiement
verify_deployment() {
    log_info "Vérification du déploiement..."
    
    # Attendre que les services démarrent
    sleep 10
    
    local base_url="${BASE_URL:-http://localhost:3000}"
    
    # Vérifier l'endpoint de santé principal
    if curl -f -s "$base_url/health" > /dev/null; then
        log_success "Service principal opérationnel"
    else
        log_error "Service principal non accessible"
        return 1
    fi
    
    # Vérifier l'interface d'administration AI
    if curl -f -s "$base_url/admin/ai-settings" > /dev/null; then
        log_success "Interface d'administration AI accessible"
    else
        log_warning "Interface d'administration AI non accessible (normal si authentification requise)"
    fi
    
    log_success "Vérification du déploiement terminée"
}

# Affichage des instructions post-déploiement
show_post_deployment_instructions() {
    log_info "Instructions post-déploiement:"
    echo ""
    echo "🔧 Configuration AI:"
    echo "   1. Accédez à l'interface d'administration: ${BASE_URL:-http://localhost:3000}/admin/ai-settings"
    echo "   2. Configurez votre clé API OpenAI"
    echo "   3. Ajustez les paramètres selon vos besoins"
    echo "   4. Testez la connexion OpenAI"
    echo ""
    echo "📊 Monitoring:"
    echo "   - Santé du système: ${BASE_URL:-http://localhost:3000}/health"
    echo "   - Statistiques du cache: Disponibles dans l'interface d'administration"
    echo ""
    echo "📚 Documentation:"
    echo "   - Guide d'administration: docs/admin/ai-settings-guide.md"
    echo "   - Guide de dépannage: docs/deployment/ai-troubleshooting-guide.md"
    echo ""
}

# Flux principal simplifié
main() {
    log_info "Démarrage du déploiement des fonctionnalités AI"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "Mode DRY RUN - aucune modification ne sera effectuée"
    fi
    
    # Étapes essentielles uniquement
    validate_environment
    deploy_database_schema
    deploy_application
    verify_deployment
    
    log_success "Déploiement des fonctionnalités AI terminé avec succès!"
    show_post_deployment_instructions
}

# Exécution du script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Analyse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --env)
                DEPLOYMENT_ENV="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--dry-run] [--env ENVIRONMENT]"
                echo ""
                echo "Script de déploiement simplifié pour les fonctionnalités AI"
                echo ""
                echo "Options:"
                echo "  --dry-run    Exécuter sans faire de modifications"
                echo "  --env        Environnement de déploiement (défaut: production)"
                echo ""
                echo "Ce script se contente des tâches essentielles:"
                echo "  1. Validation de l'environnement"
                echo "  2. Création du schéma de base de données"
                echo "  3. Déploiement de l'application"
                echo "  4. Vérification post-déploiement"
                echo ""
                echo "La configuration AI se fait ensuite via l'interface d'administration:"
                echo "  http://localhost:3000/admin/ai-settings"
                exit 0
                ;;
            *)
                log_error "Option inconnue: $1"
                exit 1
                ;;
        esac
    done
    
    main "$@"
fi