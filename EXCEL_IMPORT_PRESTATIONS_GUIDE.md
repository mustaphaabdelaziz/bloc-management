# Guide d'Importation Excel des Prestations

## Vue d'ensemble

Le système de gestion Bloc Management permet maintenant d'importer des prestations chirurgicales en masse via des fichiers Excel. Cette fonctionnalité permet aux administrateurs de gagner du temps en créant plusieurs prestations simultanément.

## Fonctionnalités

### 1. Téléchargement du Modèle Excel

Deux options sont disponibles pour télécharger le modèle :

- **Télécharger (Navigateur)** : Génère le modèle directement dans votre navigateur via JavaScript (plus rapide)
- **Télécharger (Serveur)** : Télécharge depuis le serveur (fallback si JavaScript est bloqué)

Le modèle contient :
- Une feuille "Prestations" avec des exemples de données
- Une feuille "Instructions" avec des conseils détaillés
- Les noms des spécialités disponibles dans le système

### 2. Format du Fichier Excel

#### Colonnes Obligatoires

| Colonne | Description | Format | Exemple |
|---------|-------------|--------|---------|
| **Désignation** | Nom complet de la prestation | Texte | Pontage Aorto-Coronarien |
| **Spécialité** | Nom exact de la spécialité (sensible à la casse) | Texte | Cardiologie |
| **Prix HT (DA)** | Prix hors taxe en Dinars Algériens | Nombre positif | 250000 |
| **TVA (%)** | Taux de TVA | 0, 9, ou 19 | 9 |
| **Durée (minutes)** | Durée estimée de l'intervention | Nombre positif | 120 |

#### Colonnes Optionnelles

| Colonne | Description | Défaut | Exemple |
|---------|-------------|--------|---------|
| **Code** | Code unique de la prestation | Auto-généré | CARD-001 |
| **Unité Dépassement (min)** | Tranche de dépassement | 15 | 15 |
| **Frais Dépassement (DA)** | Frais par tranche | 0 | 500 |
| **Frais Urgents (%)** | Majoration pour urgence | 0 | 10 |

### 3. Processus d'Importation

1. **Accéder à la page** : Naviguez vers "Gestion des Prestations"
2. **Cliquer sur "Importer Excel"** : Ouvre la fenêtre modale
3. **Télécharger le modèle** (optionnel) : Si vous n'avez pas encore de fichier
4. **Remplir le fichier Excel** : Suivez le format du modèle
5. **Sélectionner le fichier** : Choisissez votre fichier .xlsx ou .xls
6. **Valider** : Le système vérifie la taille (max 5 MB) et le format
7. **Importer** : Cliquez sur le bouton "Importer"

### 4. Résultats de l'Importation

Après l'import, une page de résultats s'affiche avec :

- **Résumé** : Nombre total de lignes, succès, et erreurs
- **Détails des erreurs** : Liste des lignes ayant échoué avec messages explicites
- **Conseils de correction** : Suggestions pour résoudre les problèmes

#### Messages d'Erreur Courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| Désignation manquante | Colonne vide | Remplir le nom de la prestation |
| Spécialité non trouvée | Nom incorrect | Vérifier l'orthographe exacte |
| Prix HT invalide | Format non numérique | Utiliser un nombre (ex: 150000) |
| Durée invalide | Valeur négative/nulle | Utiliser un nombre positif |
| Code existe déjà | Doublon | Laisser vide pour auto-génération |

## Contraintes Techniques

- **Taille maximale** : 5 MB par fichier
- **Formats acceptés** : .xlsx, .xls
- **Traitement** : En mémoire (pas de stockage temporaire)
- **Permissions** : Réservé aux rôles `admin` et `direction`
- **Spécialités** : Doivent exister dans le système avant l'import

## Exemples de Données

### Exemple 1 : Import basique
```
| Désignation           | Spécialité         | Prix HT (DA) | TVA (%) | Durée (minutes) |
|-----------------------|--------------------|--------------|---------|-----------------|
| Appendicectomie       | Chirurgie Générale | 80000        | 9       | 45              |
```

### Exemple 2 : Import avec options
```
| Code     | Désignation | Spécialité  | Prix HT | TVA | Durée | Unité Dép. | Frais Dép. | Frais Urg. |
|----------|-------------|-------------|---------|-----|-------|------------|------------|------------|
| CARD-001 | Pontage AC  | Cardiologie | 250000  | 9   | 120   | 15         | 500        | 10         |
```

## Conseils et Bonnes Pratiques

### Préparation des Données

1. **Vérifier les spécialités** : Assurez-vous que toutes les spécialités existent dans le système
2. **Utiliser le modèle** : Partez toujours du modèle fourni pour éviter les erreurs de format
3. **Tester avec peu de lignes** : Commencez par importer 2-3 prestations pour valider le format
4. **Sauvegarder votre fichier** : Gardez une copie avant l'import

### Gestion des Erreurs

1. **Lire attentivement** : Consultez les messages d'erreur détaillés
2. **Corriger par lot** : Regroupez les corrections similaires
3. **Réimporter** : Importez uniquement les lignes corrigées
4. **Contact support** : En cas de problème persistant

### Performance

- Pour plus de 100 prestations, divisez en plusieurs fichiers
- Évitez les formules Excel complexes, utilisez des valeurs simples
- Fermez les autres applications pour libérer de la mémoire

## Accès aux Fonctionnalités

### Par Rôle

| Rôle | Voir Prestations | Télécharger Modèle | Importer |
|------|------------------|--------------------| ---------|
| admin | ✅ | ✅ | ✅ |
| direction | ✅ | ✅ | ✅ |
| headDepart | ✅ (sans prix) | ✅ | ❌ |
| assistante | ✅ (sans prix) | ✅ | ❌ |

## Routes API

### GET /prestations/template
Télécharge le modèle Excel avec exemples et instructions.

**Permissions** : Tous les utilisateurs authentifiés qui peuvent voir les prestations

**Réponse** : Fichier `Modele_Import_Prestations.xlsx`

### POST /prestations/import
Importe les prestations depuis un fichier Excel.

**Permissions** : `admin`, `direction` uniquement

**Body** : `multipart/form-data` avec champ `excelFile`

**Réponse** : Redirection vers page de résultats

## Support et Dépannage

### Problèmes Fréquents

**Q : Le bouton de téléchargement ne fonctionne pas**  
R : Utilisez le bouton "Télécharger (Serveur)" comme alternative

**Q : Mon fichier est refusé**  
R : Vérifiez l'extension (.xlsx ou .xls) et la taille (< 5 MB)

**Q : Les spécialités ne sont pas reconnues**  
R : Les noms doivent correspondre exactement (majuscules/minuscules)

**Q : L'import prend beaucoup de temps**  
R : Normal pour plus de 50 lignes, patientez sans recharger la page

### Logs et Débogage

Les erreurs d'import sont loguées côté serveur :
```bash
# Voir les logs du serveur
npm run dev
# Observer la console pour les erreurs détaillées
```

## Mise à Jour et Évolutions Futures

### Version actuelle (v1.0)
- ✅ Import basique avec validation
- ✅ Téléchargement de modèle (client + serveur)
- ✅ Page de résultats détaillée
- ✅ Gestion des erreurs par ligne

### Prochaines versions (prévu)
- 🔄 Mise à jour en masse (modifier prestations existantes)
- 🔄 Export Excel des prestations actuelles
- 🔄 Import incrémental (ajouter sans écraser)
- 🔄 Validation des doublons designation+spécialité
- 🔄 Normalisation des noms de spécialités (accents)

---

**Dernière mise à jour** : 24 Novembre 2025  
**Version** : 1.0  
**Contact** : Support Technique Bloc Management
