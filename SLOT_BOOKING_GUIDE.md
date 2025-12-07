# Guide de Réservation par Créneaux Horaires

## Vue d'ensemble

Le système de réservation par créneaux permet aux utilisateurs de réserver des blocs opératoires en sélectionnant visuellement des créneaux horaires d'une heure. Cette interface remplace la saisie manuelle des horaires et offre une visualisation immédiate de la disponibilité.

## Accès

### Navigation
- **Menu:** Chirurgies → Réservation par créneaux
- **URL directe:** `http://localhost:7777/surgeries/planning/book-slots`

### Permissions requises
- Admin
- Direction
- Chef de département (headDepart)
- Assistante
- Chirurgien (medecin) - pour ses propres réservations

## Fonctionnalités

### 1. Sélection de Date et Bloc
- **Date picker:** Sélectionner la date de la chirurgie (minimum: aujourd'hui)
- **Bloc opératoire:** Choisir parmi les salles actives
- **Bouton "Afficher les Créneaux":** Charge la grille horaire

### 2. Grille des Créneaux
- **Plage horaire:** 8h00 - 18h00 (10 créneaux d'1 heure)
- **Indicateurs visuels:**
  - 🟢 **Vert (Disponible):** Créneau libre
  - 🔴 **Rouge (Occupé):** Créneau déjà réservé
  - 🔵 **Bleu (Sélectionné):** Créneau en cours de sélection

### 3. Sélection de Créneaux
- **Cliquer sur un créneau vert** pour le sélectionner
- **Sélection multiple:** Cliquer sur plusieurs créneaux consécutifs
- **Contrainte:** Les créneaux doivent être **consécutifs** (adjacents)
- **Désélection:** Cliquer à nouveau sur un créneau sélectionné

### 4. Résumé de Sélection
Une fois des créneaux sélectionnés, un panneau s'affiche avec:
- Nombre de créneaux sélectionnés
- Durée totale en heures
- Plage horaire (début → fin)

### 5. Détails de la Chirurgie
Après validation de la sélection, remplir:
- **Patient** (requis)
- **Chirurgien** (requis)
- **Prestation** (requis)
- **Notes** (optionnel)

### 6. Validation
- Le système vérifie automatiquement les conflits avant création
- Si un créneau est pris entre-temps, une erreur s'affiche
- Une chirurgie est créée avec le statut "Planifié" (planned)
- Redirection vers la fiche de la chirurgie créée

## Workflow Complet

1. **Accéder à l'interface:** Menu Chirurgies → Réservation par créneaux
2. **Sélectionner date et bloc:** Choisir la date et le bloc opératoire
3. **Charger les créneaux:** Cliquer sur "Afficher les Créneaux Disponibles"
4. **Visualiser la disponibilité:** Voir les créneaux verts (libres) et rouges (occupés)
5. **Sélectionner les créneaux:** Cliquer sur les créneaux verts consécutifs nécessaires
6. **Vérifier le résumé:** Contrôler la durée totale et l'horaire
7. **Remplir les détails:** Patient, chirurgien, prestation
8. **Créer la réservation:** Cliquer sur "Créer la Réservation"
9. **Confirmation:** Redirection vers la chirurgie créée

## Validation et Contrôles

### Côté Client (JavaScript)
- Vérification de la contiguïté des créneaux
- Contrôle des champs obligatoires
- Affichage d'erreurs en temps réel

### Côté Serveur (Backend)
- Double vérification de disponibilité (race condition protection)
- Validation des horaires
- Génération automatique du code chirurgie
- Création transactionnelle

## Points Techniques

### Génération des Créneaux
- Service: `services/reservationService.js` → `generateSlotsForDay()`
- Créneaux: 8h-9h, 9h-10h, ..., 17h-18h
- Chaque créneau contient:
  - `start`, `end`: timestamps ISO
  - `label`: "08:00 - 09:00"
  - `status`: 'free' ou 'taken'
  - `surgery`: infos si occupé (code, chirurgien, patient)

### Endpoint AJAX
- **GET** `/surgeries/planning/slots?roomId=XXX&date=YYYY-MM-DD`
- Retourne JSON: `{ success: true, slots: [...], roomId, date }`

### Création de Réservation
- **POST** `/surgeries/new/reservation`
- Body JSON: `{ patient, surgeon, prestation, operatingRoom, scheduledStartTime, scheduledEndTime, reservationNotes }`
- Retour: `{ success: true, surgeryId, surgery: {...} }`

## Messages d'Erreur

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Veuillez sélectionner une date et un bloc opératoire" | Date ou bloc manquant | Remplir les deux champs |
| "Les créneaux sélectionnés doivent être consécutifs" | Créneaux non adjacents | Sélectionner des créneaux qui se suivent |
| "Veuillez remplir tous les champs obligatoires" | Patient/chirurgien/prestation manquant | Remplir tous les champs requis |
| "Un ou plusieurs créneaux sont déjà réservés" | Conflit détecté | Recharger les créneaux et choisir d'autres horaires |

## Exemples d'Usage

### Chirurgie de 2 heures
1. Sélectionner date et bloc
2. Charger les créneaux
3. Cliquer sur 2 créneaux consécutifs (ex: 9h-10h et 10h-11h)
4. Durée affichée: 2 heures
5. Horaire: 09:00 - 11:00
6. Remplir les détails et créer

### Chirurgie urgente de 3 heures
1. Sélectionner date = aujourd'hui
2. Choisir bloc disponible
3. Sélectionner 3 créneaux (ex: 14h-15h, 15h-16h, 16h-17h)
4. Durée: 3 heures, Horaire: 14:00 - 17:00
5. Créer avec statut "planned"

## Différences avec Planning Classique

| Fonctionnalité | Planning Classique | Réservation par Créneaux |
|----------------|-------------------|--------------------------|
| Saisie horaire | Manuelle (datetime pickers) | Visuelle (sélection de créneaux) |
| Visualisation disponibilité | Après tentative | Immédiate (couleurs) |
| Durée | Calculée après saisie | Visible en temps réel |
| Granularité | Minutes | Heures (créneaux de 60 min) |
| Conflits | Détectés à la soumission | Visibles avant sélection |

## Intégration avec le Système

- **Chirurgies créées:** Statut "planned", visible dans Liste des chirurgies
- **Champs remplis automatiquement:** `scheduledStartTime`, `scheduledEndTime`, `operatingRoom`, `reservationStatus='confirmed'`
- **Code auto-généré:** Format CH001, CH002, etc.
- **Calcul des frais:** Effectué après ajout des matériaux et staff

## Limitations

- **Granularité fixe:** 1 heure par créneau (impossible de réserver 1h30)
- **Plage horaire fixe:** 8h-18h (configurable dans le code)
- **Pas de modification:** Pour changer les créneaux, utiliser "Planification des salles"

## Support et Dépannage

### Créneaux ne se chargent pas
- Vérifier la connexion serveur (Console F12)
- S'assurer qu'au moins un bloc opératoire existe et est actif

### Sélection ne fonctionne pas
- Recharger la page
- Vérifier que les créneaux sont verts (libres)

### Erreur de création
- Vérifier les champs obligatoires
- Contrôler les données (patient/chirurgien/prestation existent)
- Consulter les logs serveur

## Fichiers Concernés

```
controller/surgery.controller.js    → showSlotBooking, getSlots, createReservationFromSlots
services/reservationService.js      → generateSlotsForDay, validateContiguousSlots
routes/surgery.routes.js            → /planning/book-slots, /planning/slots, /new/reservation
views/surgeries/slotBooking.ejs     → Interface utilisateur complète
views/partials/navbar-layout.ejs    → Lien dans menu navigation
```

## FAQ

**Q: Puis-je réserver moins d'une heure?**  
R: Non, la granularité minimale est 1 heure (1 créneau).

**Q: Que se passe-t-il si je sélectionne des créneaux non consécutifs?**  
R: Le système affiche une erreur et empêche la création. Vous devez sélectionner des créneaux adjacents.

**Q: Comment modifier une réservation existante?**  
R: Utilisez "Planification des salles" ou la fiche chirurgie pour modifier les horaires.

**Q: Les créneaux affichés sont obsolètes, comment rafraîchir?**  
R: Cliquez à nouveau sur "Afficher les Créneaux Disponibles" pour recharger.

**Q: Puis-je réserver pour un autre chirurgien?**  
R: Oui, si vous êtes admin/direction/headDepart. Les chirurgiens ne voient que leurs propres créneaux.

---

**Dernière mise à jour:** 2025-01-18  
**Version:** 1.0  
**Statut:** Production Ready
