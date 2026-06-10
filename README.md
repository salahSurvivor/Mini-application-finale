# MealMate - Expo + TheMealDB

Mini application mobile React Native avec Expo pour explorer des recettes via l'API gratuite TheMealDB.

## Fonctionnalites

- Navigation entre plusieurs ecrans: categories, recettes filtrees, recherche et detail.
- Consommation API REST TheMealDB:
  - `categories.php` pour lister les categories.
  - `filter.php?c=...` pour filtrer par categorie.
  - `search.php?s=...` pour rechercher par nom et charger les details.
- Gestion d'etat locale avec React hooks.
- Interactions: recherche instantanee, favoris, retour, selection de recette.
- Interface moderne et responsive.

## Lancer le projet

```bash
npm install
npm start
```

Ensuite, scanner le QR code avec Expo Go ou lancer sur emulateur Android/iOS depuis le terminal Expo.

## Depot GitHub

Pour publier le code source:

```bash
git add .
git commit -m "Create MealMate recipe app"
git remote add origin https://github.com/<votre-utilisateur>/<votre-repo>.git
git push -u origin main
```

## Video de demonstration

Une courte video peut montrer:

1. L'ouverture de l'application.
2. La liste des categories.
3. Le filtre par categorie.
4. L'ouverture du detail d'une recette.
5. La recherche par nom.
6. L'ajout/retrait de favoris.
