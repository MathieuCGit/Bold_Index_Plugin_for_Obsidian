
WARNING : Plugin not supposed to be used in production - Still under HEAVY DEV

# Bold Index Navigation

Plugin Obsidian qui affiche, dans un panneau de la sidebar, un index cliquable de tous les mots ou expressions mis en **gras** dans la note active. Cliquer sur une entrée de l'index sélectionne son occurrence dans le texte et fait défiler l'éditeur jusqu'à elle.

## Fichiers du plugin

| Fichier | Rôle |
|---|---|
| `manifest.json` | Métadonnées du plugin lues par Obsidian (id, nom, version, compatibilité). |
| `main.js` | Tout le code du plugin : la vue du panneau et la classe principale. |

## Vue d'ensemble du fonctionnement

```
┌─────────────────────────┐        événements workspace         ┌───────────────────────┐
│   BoldIndexPlugin        │  registerView() / addCommand()      │   Obsidian workspace   │
│   (classe principale)    │ ───────────────────────────────────▶│                        │
└─────────────────────────┘                                      └───────────┬────────────┘
                                                                               │ file-open
                                                                               │ editor-change
                                                                               ▼
                                                                  ┌───────────────────────┐
                                                                  │   BoldIndexView        │
                                                                  │   (panneau sidebar)    │
                                                                  │                        │
                                                                  │  update()  ──▶ lit la  │
                                                                  │              note, en  │
                                                                  │        extrait les     │
                                                                  │        mots en gras,   │
                                                                  │        les affiche     │
                                                                  │                        │
                                                                  │  jumpToTerm() ──▶ au   │
                                                                  │        clic, retrouve  │
                                                                  │        la note et y    │
                                                                  │        sélectionne le  │
                                                                  │        mot ciblé       │
                                                                  └───────────────────────┘
```

Le plugin repose sur deux classes définies dans `main.js` :

### 1. `BoldIndexPlugin` (classe principale, exportée par défaut)

C'est le point d'entrée reconnu par Obsidian (`main` déclaré dans `manifest.json`). Son rôle se limite à de l'**enregistrement** :

- `onload()` : enregistre le type de vue `BoldIndexView` auprès du workspace (`registerView`) et ajoute une commande à la palette (`Ctrl/Cmd+P`) pour ouvrir le panneau.
- `activateView()` : ouvre le panneau dans la sidebar droite s'il n'existe pas déjà, sinon le ramène au premier plan (`revealLeaf`). Évite les doublons de panneau.

Cette classe ne contient aucune logique métier (pas d'analyse de texte, pas de navigation) : elle délègue tout à `BoldIndexView`.

### 2. `BoldIndexView` (le panneau lui-même)

Étend `ItemView`, la classe standard d'Obsidian pour créer un panneau custom affiché dans un "leaf" (un emplacement de la disposition de fenêtre : sidebar, split, etc.).

Deux responsabilités bien séparées :

#### a) Construire l'index — `update()`

1. Récupère la note active (`workspace.getActiveFile()`).
2. Mémorise cette note dans `this.linkedFile` (voir pourquoi ci-dessous, section navigation).
3. Lit son contenu (`vault.read()`) et extrait tous les segments `**...**` via une regex.
4. Déduplique et trie alphabétiquement (tri sensible au français via `localeCompare(..., 'fr')`).
5. Génère un `<span>` cliquable par terme trouvé, dans une `<ul>`.

`update()` est rappelée automatiquement à chaque ouverture de note (`file-open`) et à chaque frappe dans l'éditeur (`editor-change`), pour que l'index reste synchronisé en temps réel.

#### b) Naviguer vers un mot — `jumpToTerm(term)`

Appelée au clic sur une entrée de l'index. Le point délicat de cette fonction :

> **Pourquoi ne pas simplement utiliser `workspace.getActiveViewOfType(MarkdownView)` ?**
> Parce qu'au moment du clic, l'utilisateur vient d'interagir avec le panneau d'index — c'est donc *ce panneau* qui est le leaf actif du workspace, pas la note markdown. `getActiveViewOfType(MarkdownView)` renverrait `null`.

La fonction retrouve donc explicitement la bonne note :

1. Utilise `this.linkedFile` (mémorisé lors du dernier `update()`) pour savoir quel fichier cibler.
2. Liste tous les leafs de type `markdown` ouverts (`getLeavesOfType('markdown')`) et cherche celui qui affiche ce fichier.
3. **Active** ce leaf explicitement (`setActiveLeaf(..., { focus: true })`) — c'est cette étape qui rend la navigation fiable, indépendamment de ce qui était actif juste avant le clic.
4. Cherche la première occurrence exacte de `**terme**` dans le texte de l'éditeur, convertit sa position en coordonnées `{line, ch}` via `editor.offsetToPos()`, puis sélectionne et scrolle jusqu'à elle.

## Limites connues

- **Occurrences multiples** : si un même mot en gras apparaît plusieurs fois dans la note, `jumpToTerm()` navigue toujours vers la **première** occurrence (`indexOf` ne cherche qu'un seul résultat).
- **Une seule note à la fois** : l'index ne montre que les mots en gras de la note active ; il ne fait pas d'agrégation multi-notes.
- **Correspondance stricte du texte** : la recherche de position utilise le texte exact `**terme**` (terme déjà trimé). Si la mise en forme d'origine contient des espaces à l'intérieur des `**` (ex. `**  terme  **`), elle ne sera pas retrouvée.

## Pistes d'amélioration possibles

- Navigation cyclique entre occurrences multiples d'un même terme (clics successifs → occurrence suivante).
- Option pour indexer aussi les *italiques* ou les surlignages `==...==`.
- Compteur d'occurrences affiché à côté de chaque terme dans le panneau.
