import sqlite3
import json
from typing import List, Dict, Optional
from datetime import datetime
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Chemin vers la base de données (même que Next.js)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'logistix.db')
logger.info(f"DB_PATH: {DB_PATH}")

def get_db_connection():
    """Créer une connexion à la base de données SQLite"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        
        # Appliquer les migrations
        with conn:
            # Table utilisateurs
            conn.execute('''CREATE TABLE IF NOT EXISTS users (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          username TEXT UNIQUE NOT NULL,
                          email TEXT UNIQUE NOT NULL,
                          hashed_password TEXT NOT NULL,
                          is_admin BOOLEAN NOT NULL DEFAULT 0,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
            
            # Table analyses
            conn.execute('''CREATE TABLE IF NOT EXISTS market_analyses (
                            id TEXT PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            product_name TEXT NOT NULL,
                            current_price REAL,
                            min_price REAL,
                            max_price REAL,
                            avg_price REAL,
                            sales_volume INTEGER,
                            competitor_count INTEGER,
                            trend TEXT,
                            trend_percentage REAL,
                            last_updated TIMESTAMP,
                            recommended_price REAL,
                            market_share REAL,
                            demand_level TEXT,
                            competitors TEXT,
                            created_at TIMESTAMP,
                            updated_at TIMESTAMP,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )''')
            # Table historical_prices
            conn.execute('''CREATE TABLE IF NOT EXISTS historical_prices (
                            id TEXT PRIMARY KEY,
                            product_name TEXT NOT NULL,
                            date TIMESTAMP NOT NULL,
                            price REAL,
                            sales_volume INTEGER
                        )''')
            
            # Migration pour la colonne is_admin (à conserver pour les migrations futures si la colonne n'existait pas)
            try:
                conn.execute('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0')
            except sqlite3.OperationalError:
                pass  # La colonne existe déjà
        
        logger.info("Connexion à la base de données établie avec schéma à jour")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Erreur de connexion à la base de données: {e}")
        raise

def save_market_analysis(user_id: str, analysis_data: Dict) -> str:
    logger.info(f"Tentative de sauvegarde de l'analyse de marché pour l'utilisateur {user_id}")
    """
    Sauvegarde une analyse de marché dans la base de données
    Retourne l'ID de l'analyse sauvegardée
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Générer un ID unique
        analysis_id = f"analysis_{int(datetime.now().timestamp() * 1000)}"
        timestamp = datetime.now().isoformat()
        
        # Préparer les données pour insertion
        competitors_json = json.dumps(analysis_data.get('competitors', []))
        
        # Vérifier si une analyse existe déjà pour ce produit
        cursor.execute(
            "SELECT id FROM market_analyses WHERE user_id = ? AND product_name = ?",
            (user_id, analysis_data.get('productName'))
        )
        existing = cursor.fetchone()
        
        if existing:
            # Mettre à jour l'analyse existante
            cursor.execute("""
                UPDATE market_analyses SET
                    current_price = ?, min_price = ?, max_price = ?, avg_price = ?,
                    sales_volume = ?, competitor_count = ?, trend = ?, trend_percentage = ?,
                    last_updated = ?, recommended_price = ?, market_share = ?, demand_level = ?,
                    competitors = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
            """, (
                analysis_data['currentPrice'], analysis_data['minPrice'], analysis_data['maxPrice'], analysis_data['avgPrice'],
                analysis_data['salesVolume'], analysis_data['competitorCount'], analysis_data['trend'], analysis_data['trendPercentage'],
                analysis_data['lastUpdated'], analysis_data['recommendedPrice'], analysis_data['marketShare'], analysis_data['demandLevel'],
                competitors_json, timestamp, existing['id'], user_id
            ))
            logger.info(f"Analyse de marché mise à jour avec ID: {analysis_id}")
            analysis_id = existing['id']
        else:
            # Créer une nouvelle analyse
            cursor.execute("""
                INSERT INTO market_analyses (
                    id, user_id, product_name, current_price, min_price, max_price, avg_price,
                    sales_volume, competitor_count, trend, trend_percentage, last_updated,
                    recommended_price, market_share, demand_level, competitors, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis_id, user_id, analysis_data['productName'], analysis_data['currentPrice'], 
                analysis_data['minPrice'], analysis_data['maxPrice'], analysis_data['avgPrice'],
                analysis_data['salesVolume'], analysis_data['competitorCount'], analysis_data['trend'], 
                analysis_data['trendPercentage'], analysis_data['lastUpdated'],
                analysis_data['recommendedPrice'], analysis_data['marketShare'], analysis_data['demandLevel'], 
                competitors_json, timestamp, timestamp
            ))
            logger.info(f"Nouvelle analyse de marché sauvegardée avec ID: {analysis_id}")
        
        # Enregistrer les données historiques
        cursor.execute("""
            INSERT INTO historical_prices (id, product_name, date, price, sales_volume)
            VALUES (?, ?, ?, ?, ?)
        """, (
            f"hist_{int(datetime.now().timestamp() * 1000)}",
            analysis_data['productName'],
            timestamp,
            analysis_data['avgPrice'],
            analysis_data['salesVolume']
        ))
        
        conn.commit()
        return analysis_id
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Erreur lors de la sauvegarde: {str(e)}")
        raise Exception(f"Erreur lors de la sauvegarde: {str(e)}")
    finally:
        conn.close()

def get_all_market_analyses(user_id: str) -> List[Dict]:
    logger.info(f"Tentative de récupération de toutes les analyses de marché pour l'utilisateur {user_id}")
    """
    Récupère toutes les analyses de marché pour un utilisateur
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT
                id, product_name as productName, current_price as currentPrice,
                min_price as minPrice, max_price as maxPrice, avg_price as avgPrice,
                sales_volume as salesVolume, competitor_count as competitorCount,
                trend, trend_percentage as trendPercentage, last_updated as lastUpdated,
                recommended_price as recommendedPrice, market_share as marketShare,
                demand_level as demandLevel, competitors
            FROM market_analyses
            WHERE user_id = ?
            ORDER BY updated_at DESC
        """, (user_id,))
        
        analyses = []
        for row in cursor.fetchall():
            analysis = dict(row)
            # Parser les competitors JSON
            try:
                analysis['competitors'] = json.loads(analysis['competitors'] or '[]')
            except (json.JSONDecodeError, TypeError):
                analysis['competitors'] = []
            analyses.append(analysis)
        
        logger.info(f"Récupération de {len(analyses)} analyses pour l'utilisateur {user_id}")
        return analyses
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des analyses: {str(e)}")
        raise Exception(f"Erreur lors de la récupération: {str(e)}")
    finally:
        conn.close()

def get_market_analysis_by_id(user_id: str, analysis_id: str) -> Optional[Dict]:
    logger.info(f"Récupération de l'analyse {analysis_id} pour l'utilisateur {user_id}")
    conn = get_db_connection()
    try:
        # Récupérer l'analyse principale
        analysis_row = conn.execute("""
            SELECT
                id, product_name as productName, current_price as currentPrice,
                min_price as minPrice, max_price as maxPrice, avg_price as avgPrice,
                sales_volume as salesVolume, competitor_count as competitorCount,
                trend, trend_percentage as trendPercentage, last_updated as lastUpdated,
                recommended_price as recommendedPrice, market_share as marketShare,
                demand_level as demandLevel, competitors
            FROM market_analyses
            WHERE id = ? AND user_id = ?
        """, (analysis_id, user_id)).fetchone()

        if not analysis_row:
            logger.warning(f"Analyse {analysis_id} non trouvée.")
            return None

        analysis = dict(analysis_row)
        analysis['competitors'] = json.loads(analysis['competitors'] or '[]')

        # Récupérer l'historique des prix
        history_rows = conn.execute("""
            SELECT
                date as lastUpdated,
                price as avgPrice,
                sales_volume as salesVolume
            FROM historical_prices
            WHERE product_name = ?
            ORDER BY date ASC
        """, (analysis['productName'],)).fetchall()

        analysis['priceEvolution'] = [dict(row) for row in history_rows]
        
        logger.info(f"Analyse {analysis_id} et son historique récupérés avec succès.")
        return analysis
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'analyse par ID: {e}")
        raise
    finally:
        conn.close()

def delete_market_analysis(user_id: str, analysis_id: str) -> bool:
    logger.info(f"Tentative de suppression de l'analyse {analysis_id} pour l'utilisateur {user_id}")
    """
    Supprime une analyse de marché
    Retourne True si la suppression a réussi
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "DELETE FROM market_analyses WHERE id = ? AND user_id = ?",
            (analysis_id, user_id)
        )
        
        deleted_count = cursor.rowcount
        conn.commit()
        
        if deleted_count > 0:
            logger.info(f"Analyse {analysis_id} supprimée avec succès.")
        else:
            logger.warning(f"Analyse {analysis_id} non trouvée pour l'utilisateur {user_id}.")
        return deleted_count > 0
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Erreur lors de la suppression: {str(e)}")
        raise Exception(f"Erreur lors de la suppression: {str(e)}")
    finally:
        conn.close()

def get_user_by_id(user_id: str) -> Optional[Dict]:
    logger.info(f"Tentative de récupération de l'utilisateur avec l'ID: {user_id}")
    """
    Récupère un utilisateur basé sur son ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, username, is_admin FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if user:
            logger.info(f"Utilisateur trouvé: {user['username']}")
            return {"id": user["id"], "username": user["username"], "isAdmin": bool(user["is_admin"])}
        logger.warning(f"Utilisateur non trouvé pour l'ID: {user_id}")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'utilisateur par ID: {str(e)}")
        return None
    finally:
        conn.close()