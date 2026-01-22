import os

# Configuration des profils basée sur votre mkdocs.yml
PROFILES = {
    'manager': [
        'manager/index.md',
        'manager/dashboard.md',
        'manager/operations.md',
        'manager/stock_sales.md',
        'manager/finance.md',
        'manager/reporting_config.md'
    ],
    'storekeeper': [
        'storekeeper/index.md',
        'storekeeper/articles.md',
        'storekeeper/inventory.md',
        'storekeeper/stock_tontine.md',
        'storekeeper/stock_commercial.md'
    ],
    'commercial': [
        'commercial/index.md',
        'commercial/clients_accounts.md',
        'commercial/stock.md',
        'commercial/sales_orders.md',
        'commercial/tontine.md',
        'commercial/mobile.md'
    ]
}

BASE_DIR = 'docs'
OUTPUT_DIR = os.path.join(BASE_DIR, 'print_versions')

def merge_markdown_files():
    # Créer le dossier de sortie s'il n'existe pas
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Dossier créé : {OUTPUT_DIR}")

    for profile, files in PROFILES.items():
        output_filename = os.path.join(OUTPUT_DIR, f'guide_complet_{profile}.md')
        print(f"Génération du guide pour '{profile}' -> {output_filename}")

        with open(output_filename, 'w', encoding='utf-8') as outfile:
            # Titre du document
            outfile.write(f"# Guide Utilisateur - Profil {profile.capitalize()}\n\n")
            outfile.write("_Ce document est une compilation de la documentation pour impression._\n\n")
            outfile.write("\\newpage\n\n") # Saut de page pour Pandoc/LaTeX si utilisé

            for filename in files:
                filepath = os.path.join(BASE_DIR, filename)
                if os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()

                        # Ajout du contenu
                        outfile.write(content)

                        # Ajout d'un saut de page ou séparateur entre les chapitres
                        outfile.write("\n\n\\newpage\n\n")
                        outfile.write("\n\n---\n\n")
                else:
                    print(f"ATTENTION : Fichier introuvable : {filepath}")

    print("\nTerminé ! Les fichiers complets sont dans 'user-guide/docs/print_versions/'.")
    print("Vous pouvez maintenant les convertir en PDF (via Pandoc, ou en les ouvrant dans VS Code/Obsidian et en exportant en PDF).")

if __name__ == "__main__":
    merge_markdown_files()
