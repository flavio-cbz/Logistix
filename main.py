import requests
import json
import time
import random
import sys
import pandas as pd
import os
from dotenv import load_dotenv
from datetime import datetime
import argparse # Ajout de l'import argparse

load_dotenv()

# --- FICHIERS DE SORTIE ---
# Modèle de nom pour les fichiers de données brutes. Un fichier par type de recherche.
DATA_FILE_TEMPLATE = "vinted_data_{search_term}.csv"
# Fichier unique qui accumulera tous les résultats d'analyse de l'IA.
ANALYSIS_RESULTS_FILE = "vinted_analysis_results.csv"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# ==============================================================================
# === LISTE DES PRODUITS À ANALYSER ============================================
# ==============================================================================
# Modifiez cette section pour ajouter tous les articles que vous souhaitez évaluer.
# Chaque article est un dictionnaire.
# - terme_recherche: Ce que le script cherchera sur Vinted pour trouver des articles vendus similaires.
# - les autres clés: Les détails de l'article que VOUS voulez vendre.
LISTE_PRODUITS = [
    {
        'terme_recherche': "iphone 14 pro",
        'titre': 'iPhone 14 Pro 128Go Mauve',
        'marque': 'Apple',
        'taille': '128Go',
        'etat': 'Très bon état',
        'description': 'Vendu avec boîte et câble.'
    },
    {
        'terme_recherche': "sac a main louis vuitton neverfull",
        'titre': 'Sac à main Louis Vuitton Neverfull MM Damier Ebene',
        'marque': 'Louis Vuitton',
        'taille': 'MM',
        'etat': 'Bon état',
        'description': 'Vendu avec sa pochette intérieure. Quelques traces d\'usure aux coins.'
    },
    {
        'terme_recherche': "dyson seche cheveux",
        'titre': 'Sèche cheveux Dyson',
        'marque': 'Dyson',
        'taille': '',
        'etat': 'Neuf avec étiquette',
        'description': 'Jamais portées, vendues dans la boîte d\'origine.'
    }
    # Ajoutez autant d'articles que vous le souhaitez ici...
]
# ==============================================================================

def recuperer_articles_vendus(session, requete, nombre_pages=1):
    """Récupère les informations détaillées des articles vendus sur Vinted."""
    articles_collectes = []
    url_api = "https://www.vinted.fr/api/v2/catalog/items"

    for page in range(1, nombre_pages + 1):
        print(f"\n--- Collecte page {page} pour '{requete}'...")
        params = {'search_text': requete, 'status_ids': '2', 'page': page, 'per_page': 96}
        try:
            response = session.get(url_api, params=params)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Erreur lors de la requête : {e}")
            return None

        items = data.get('items')
        if not items: break
        print(f"{len(items)} articles trouvés.")
        for item in items:
            articles_collectes.append({'titre': item.get('title'), 'prix': float(item.get('price', {}).get('amount') or 0.0), 'marque': item.get('brand_title'), 'taille': item.get('size_title'), 'etat': item.get('status'), 'url': item.get('url')})
        time.sleep(random.uniform(1.5, 3.0))
    return articles_collectes

def sauvegarder_donnees_brutes(articles, nom_fichier):
    """Sauvegarde les données brutes collectées dans un fichier CSV de manière robuste."""
    if not articles: return
    df_nouveau = pd.DataFrame(articles)
    if os.path.exists(nom_fichier):
        try:
            df_existant = pd.read_csv(nom_fichier)
            df_combine = pd.concat([df_existant, df_nouveau])
        except pd.errors.EmptyDataError:
            df_combine = df_nouveau
    else:
        df_combine = df_nouveau
    df_combine.drop_duplicates(subset=['url'], inplace=True, keep='last')
    df_combine.to_csv(nom_fichier, index=False)
    print(f"\nDonnées brutes sauvegardées. Le fichier '{nom_fichier}' contient maintenant {len(df_combine)} entrées.")

def sauvegarder_resultat_analyse(analyse_resultat):
    """Sauvegarde le résultat de l'analyse de l'IA dans un fichier CSV dédié."""
    df_nouveau = pd.DataFrame([analyse_resultat])
    if os.path.exists(ANALYSIS_RESULTS_FILE):
        try:
            df_existant = pd.read_csv(ANALYSIS_RESULTS_FILE)
            df_combine = pd.concat([df_existant, df_nouveau])
        except pd.errors.EmptyDataError:
            df_combine = df_nouveau
    else:
        df_combine = df_nouveau
    df_combine.to_csv(ANALYSIS_RESULTS_FILE, index=False)
    print(f"Résultat de l'analyse IA sauvegardé dans '{ANALYSIS_RESULTS_FILE}'.")

def get_analysis_data():
    """Lit le fichier de résultats d'analyse et retourne son contenu en JSON."""
    if os.path.exists(ANALYSIS_RESULTS_FILE):
        try:
            df = pd.read_csv(ANALYSIS_RESULTS_FILE)
            return df.to_json(orient="records")
        except pd.errors.EmptyDataError:
            return json.dumps([])
    return json.dumps([])

async def analyser_avec_gemini(nouvel_article, df_contexte):
    """Interroge l'API Gemini pour obtenir un prix et une description suggérés."""
    if not GEMINI_API_KEY:
        print("\nAVERTISSEMENT: GEMINI_API_KEY non trouvé. L'analyse IA est désactivée.")
        return None

    print("\n--- Lancement de l'analyse par l'IA Gemini ---")
    contexte_texte = "Exemples d'articles vendus:\n"
    for index, row in df_contexte.head(5).iterrows():
        contexte_texte += f"- Titre: {row['titre']}, État: {row['etat']}, Prix: {row['prix']:.2f}€\n"

    prompt = f"""
    En tant qu'expert Vinted, analyse les données suivantes.
    Contexte: {contexte_texte}
    Article à évaluer: Titre: {nouvel_article['titre'].iloc[0]}, Marque: {nouvel_article['marque'].iloc[0]}, État: {nouvel_article['etat'].iloc[0]}, Description: {nouvel_article['description'].iloc[0]}
    Tâche : 1. Détermine un prix de vente. 2. Rédige une description de vente optimisée avec hashtags.
    Réponds au format JSON avec les clés "prix_suggere" (nombre) et "description_suggeree" (chaîne).
    """

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        response = requests.post(api_url, json=payload, headers={'Content-Type': 'application/json'})
        response.raise_for_status()
        result_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        clean_json_text = result_text.strip().lstrip('```json').lstrip('```').rstrip('```')
        result_json = json.loads(clean_json_text)
        return {"prix": float(result_json.get("prix_suggere", 0.0)), "description": result_json.get("description_suggeree", "N/A")}
    except Exception as e:
        print(f"Erreur lors de l'appel à l'API Gemini : {e}")
        return None

async def traiter_un_produit(session, produit_a_evaluer):
    """Orchestre la collecte et l'analyse pour un seul produit."""
    print(f"\n\n========================================================")
    print(f"--- DÉBUT DU TRAITEMENT POUR : {produit_a_evaluer['titre']} ---")
    print(f"========================================================")
    
    terme_recherche = produit_a_evaluer['terme_recherche']
    # Crée un nom de fichier sûr pour le système de fichiers
    nom_fichier_propre = "".join(c for c in terme_recherche if c.isalnum() or c in (' ', '_')).rstrip().replace(' ', '_')
    data_file = DATA_FILE_TEMPLATE.format(search_term=nom_fichier_propre)

    # --- PARTIE 1: COLLECTE DE DONNÉES ---
    articles_vendus = recuperer_articles_vendus(session, terme_recherche, nombre_pages=1)
    sauvegarder_donnees_brutes(articles_vendus, data_file)

    # --- PARTIE 2: ANALYSE PAR IA ---
    if os.path.exists(data_file):
        try:
            df_donnees = pd.read_csv(data_file)
        except pd.errors.EmptyDataError:
            print(f"Le fichier de données '{data_file}' est vide. Impossible de lancer l'analyse IA.")
            return

        if not df_donnees.empty:
            df_nouvel_article = pd.DataFrame([produit_a_evaluer])
            resultat_ia = await analyser_avec_gemini(df_nouvel_article, df_donnees)
            
            if resultat_ia:
                print("\n-------- RÉSULTAT DE L'ANALYSE IA --------")
                print(f"PRIX SUGGÉRÉ : {resultat_ia['prix']:.2f} €")
                print(f"DESCRIPTION SUGGÉRÉE :\n{resultat_ia['description']}")
                print("------------------------------------------")
                sauvegarder_resultat_analyse({
                    'date_analyse': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'titre_evalue': produit_a_evaluer['titre'],
                    'prix_suggere_ia': resultat_ia['prix'],
                    'description_suggeree_ia': resultat_ia['description'],
                    'contexte_recherche': terme_recherche,
                    'fichier_donnees_source': data_file
                })

async def main():
    """Fonction principale pour orchestrer le traitement de tous les produits."""
    parser = argparse.ArgumentParser(description="Script de scraping et d'analyse Vinted.")
    parser.add_argument('--search', type=str, help='Terme de recherche pour la collecte de données.')
    parser.add_argument('--pages', type=int, default=1, help='Nombre de pages à collecter.')
    parser.add_argument('--save-analysis', type=str, help='Données JSON du résultat d\'analyse à sauvegarder.')
    parser.add_argument('--get-analysis-data', action='store_true', help='Récupérer toutes les données d\'analyse sauvegardées.')
    
    args = parser.parse_args()

    access_token = os.getenv("VINTED_ACCESS_TOKEN")
    if not access_token:
        print("ERREUR: VINTED_ACCESS_TOKEN non trouvé.")
        sys.exit(1)

    session_requetes = requests.Session()
    session_requetes.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'authorization': f"Bearer {access_token}"
    })

    if args.search:
        # Logique pour la collecte de données via l'API
        search_term = args.search
        pages = args.pages
        nom_fichier_propre = "".join(c for c in search_term if c.isalnum() or c in (' ', '_')).rstrip().replace(' ', '_')
        data_file = DATA_FILE_TEMPLATE.format(search_term=nom_fichier_propre)
        articles_vendus = recuperer_articles_vendus(session_requetes, search_term, pages)
        sauvegarder_donnees_brutes(articles_vendus, data_file)
        print(json.dumps({"status": "success", "message": "Collecte terminée."}))
    elif args.save_analysis:
        # Logique pour la sauvegarde des résultats d'analyse via l'API
        try:
            analysis_data = json.loads(args.save_analysis)
            sauvegarder_resultat_analyse(analysis_data)
            print(json.dumps({"status": "success", "message": "Analyse sauvegardée."}))
        except json.JSONDecodeError:
            print(json.dumps({"status": "error", "message": "Données d'analyse JSON invalides."}))
    elif args.get_analysis_data:
        # Logique pour récupérer les données d'analyse via l'API
        data = get_analysis_data()
        print(data)
    else:
        # Comportement par défaut si aucun argument spécifique n'est fourni
        for produit in LISTE_PRODUITS:
            await traiter_un_produit(session_requetes, produit)
        
        print("\n\n--- Tous les produits ont été traités. Script terminé. ---")

if __name__ == "__main__":
    import asyncio
