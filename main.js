/**
 * Bold Index Navigation — plugin Obsidian
 * ----------------------------------------
 * Ce plugin ajoute un panneau latéral ("Index Lexical") qui liste tous les
 * mots/expressions en **gras** de la note actuellement ouverte. Cliquer sur
 * un mot dans ce panneau sélectionne son occurrence dans l'éditeur et fait
 * défiler la vue jusqu'à lui.
 *
 * Le fichier contient deux classes :
 *   - BoldIndexView   : la vue custom affichée dans la sidebar (le panneau lui-même).
 *   - BoldIndexPlugin : la classe principale du plugin, exportée par défaut,
 *                       qui enregistre la vue et la commande pour l'ouvrir.
 */

const { Plugin, ItemView, MarkdownView } = require('obsidian');

// Identifiant unique de notre type de vue. Obsidian s'en sert pour
// retrouver/recréer le panneau (ex: après un redémarrage de l'appli).
const VIEW_TYPE = 'bold-index-view';

/**
 * BoldIndexView
 * -------------
 * Vue custom (ItemView) affichée dans un leaf de la sidebar.
 * Son rôle : afficher la liste des mots en gras de la note active,
 * et permettre d'y naviguer au clic.
 */
class BoldIndexView extends ItemView {
    constructor(leaf) {
        super(leaf);
        // Fichier (TFile) actuellement indexé par ce panneau. On le mémorise
        // ici car, une fois qu'on a cliqué DANS le panneau, ce dernier devient
        // lui-même le "leaf actif" du workspace : on ne peut donc plus se fier
        // à workspace.getActiveFile()/getActiveViewOfType() pour retrouver la
        // note d'origine. Voir jumpToTerm() plus bas.
        this.linkedFile = null;
    }

    // --- Métadonnées obligatoires pour une ItemView Obsidian ---

    // Type technique de la vue (doit correspondre à VIEW_TYPE utilisé lors
    // de l'enregistrement dans BoldIndexPlugin.onload()).
    getViewType() { return VIEW_TYPE; }

    // Titre affiché en haut du panneau / dans l'onglet de la sidebar.
    getDisplayText() { return 'Index Lexical'; }

    // Icône affichée dans l'onglet (nom d'icône Lucide, utilisées par Obsidian).
    getIcon() { return 'list-ordered'; }

    /**
     * onOpen()
     * Appelé par Obsidian quand le panneau est créé/affiché.
     * On y met en place les écouteurs d'événements qui doivent déclencher
     * un rafraîchissement du contenu du panneau.
     */
    async onOpen() {
        // this.registerEvent(...) permet à Obsidian de désinscrire proprement
        // ces écouteurs quand la vue est fermée (évite les fuites mémoire).

        // Se redéclenche à chaque fois qu'on ouvre/change de note active.
        this.registerEvent(this.app.workspace.on('file-open', () => this.update()));

        // Se redéclenche à chaque frappe dans l'éditeur, pour que la liste
        // des mots en gras reste synchronisée en temps réel avec le texte.
        this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));

        // Premier rendu du panneau à l'ouverture.
        this.update();
    }

    /**
     * jumpToTerm(term)
     * ----------------
     * Appelée au clic sur un mot du panneau. Retrouve la note liée à
     * l'index, sélectionne la première occurrence du terme en gras dans
     * son éditeur, et fait défiler la vue jusqu'à cette sélection.
     *
     * Point important : on ne peut PAS utiliser
     * this.app.workspace.getActiveViewOfType(MarkdownView) ici, car au
     * moment du clic, le leaf "actif" du workspace est ce panneau
     * d'index lui-même (puisque l'utilisateur vient d'y cliquer), et non
     * la note markdown. getActiveViewOfType renverrait donc null.
     * On retrouve à la place explicitement le leaf markdown qui affiche
     * le fichier mémorisé dans this.linkedFile, puis on l'active nous-mêmes.
     */
    jumpToTerm(term) {
        const file = this.linkedFile;
        if (!file) return; // Sécurité : aucun fichier indexé pour l'instant.

        // Récupère tous les leafs (panneaux) de type "markdown" actuellement
        // ouverts dans le workspace (il peut y en avoir plusieurs si l'utilisateur
        // a plusieurs notes ouvertes en simultané, en onglets ou en split).
        const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');

        // On cherche, parmi ces leafs, celui dont le fichier affiché correspond
        // au fichier indexé par ce panneau (comparaison par chemin, fiable
        // même si l'objet TFile a été recréé entre-temps).
        const targetLeaf = markdownLeaves.find(leaf => leaf.view?.file?.path === file.path);

        // Si la note n'est plus ouverte nulle part (ex: onglet fermé entre-temps),
        // on ne peut pas naviguer : on abandonne silencieusement.
        if (!targetLeaf) return;

        // Étape clé : on rend ce leaf actif ET on lui donne le focus.
        // C'est ce qui manquait dans la version précédente du code :
        // sans cet appel, l'éditeur récupéré ensuite ne recevrait jamais
        // vraiment le focus/la sélection visible à l'écran, et toute future
        // tentative de relire "la vue active" échouerait.
        this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });

        // Éditeur CodeMirror exposé par la vue markdown ciblée.
        const editor = targetLeaf.view.editor;

        // Contenu actuel de l'éditeur (peut différer légèrement du contenu
        // lu sur le disque si la note contient des modifications non
        // sauvegardées — d'où l'usage de editor.getValue() plutôt que de
        // relire this.app.vault.read()).
        const docText = editor.getValue();

        // Texte exact recherché : le terme entouré de ses ** de mise en forme.
        const targetText = `**${term}**`;

        // Position (en index de caractère) de la PREMIÈRE occurrence trouvée.
        // Limite connue : si le même terme en gras apparaît plusieurs fois
        // dans la note, on retombera toujours sur cette première occurrence.
        const offset = docText.indexOf(targetText);

        if (offset !== -1) {
            // Conversion des offsets "brut texte" en positions {line, ch}
            // compréhensibles par l'éditeur CodeMirror d'Obsidian.
            const posFrom = editor.offsetToPos(offset);
            const posTo = editor.offsetToPos(offset + targetText.length);

            // Sélectionne le mot en gras dans l'éditeur...
            editor.setSelection(posFrom, posTo);
            // ...puis fait défiler la vue pour que la sélection soit visible
            // (le `true` centre la sélection dans la zone visible).
            editor.scrollIntoView({ from: posFrom, to: posTo }, true);
            // Redonne explicitement le focus clavier à l'éditeur, pour que
            // l'utilisateur puisse continuer à taper immédiatement.
            editor.focus();
        }
    }

    /**
     * update()
     * --------
     * Reconstruit entièrement le contenu du panneau à partir de la note
     * active : extrait les mots en gras, les déduplique, les trie, puis
     * génère la liste cliquable dans le DOM du panneau.
     * Appelée au premier affichage, puis à chaque changement de note ou
     * de contenu (voir onOpen()).
     */
    async update() {
        // this.containerEl.children[1] est le conteneur de contenu "utile"
        // d'une ItemView Obsidian (children[0] est la barre de titre interne).
        const container = this.containerEl.children[1];

        // On vide le panneau avant de le reconstruire, pour éviter d'empiler
        // les anciens éléments à chaque mise à jour.
        container.empty();

        // Note actuellement ouverte/active dans le workspace (peut être null
        // si aucune note n'est ouverte, ex: écran d'accueil du coffre).
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            container.createEl('p', { text: 'Aucune note ouverte.', cls: 'pane-empty' });
            return;
        }

        // On mémorise le fichier lié à cet index : c'est cette référence que
        // jumpToTerm() réutilisera plus tard, quand getActiveFile() ne
        // pointera plus forcément vers la bonne note (voir commentaire
        // détaillé dans jumpToTerm()).
        this.linkedFile = activeFile;

        // Titre du panneau : nom de la note (sans extension).
        container.createEl('h4', { text: activeFile.basename });

        // Lecture du contenu de la note depuis le vault (cache Obsidian,
        // pas un accès disque brut). Reflète le contenu sauvegardé le plus
        // récent connu d'Obsidian pour ce fichier.
        const content = await this.app.vault.read(activeFile);

        // Amélioration du parsing : on veut EXTRAIRE les segments en **...**
        // tout en IGNORANT les blocs de code (``` ou ~~~) et les inline code
        // entourés par des backticks (`...`). Pour cela, on nettoie d'abord
        // une copie du contenu en supprimant ces sections, puis on applique
        // la regex sur le texte nettoyé. On calcule ensuite le nombre réel
        // d'occurrences dans le contenu d'origine pour l'affichage.
        const cleaned = content
            // supprime les fenced code blocks ```...``` et ~~~...~~~
            .replace(/```[\s\S]*?```/g, '')
            .replace(/~~~[\s\S]*?~~~/g, '')
            // supprime les inline code `...`
            .replace(/`[^`]*`/g, '');

        // Capture **...** mais évite de capturer les triples *** (italic+bold)
        // en s'assurant que la paire n'est pas suivie/précédée d'un autre '*'.
        const boldRegex = /\*\*(?!\*)(.*?)\*\*(?!\*)/g;
        const matches = [...cleaned.matchAll(boldRegex)].map(m => m[1].trim());

        // Déduplication et tri en français comme avant.
        const uniqueMatches = [...new Set(matches)].filter(t => t.length > 0).sort((a, b) => a.localeCompare(b, 'fr'));

        // Helper utilitaire pour échapper une chaîne en regex.
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (uniqueMatches.length === 0) {
            container.createEl('p', { text: 'Aucun mot en gras.', cls: 'pane-empty' });
            return;
        }

        // Conteneur <ul> de la liste, avec un style minimal "sans puces".
        const ul = container.createEl('ul', { cls: 'bold-index-list' });
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = '0';

        // Génère un <li> cliquable pour chaque mot en gras trouvé.
        uniqueMatches.forEach(term => {
            const li = ul.createEl('li');
            li.style.marginBottom = '6px';

            // On utilise un <span> plutôt qu'un <a> pour l'élément cliquable :
            // un <a> risquerait d'être intercepté par le gestionnaire de liens
            // internes d'Obsidian (qui s'attend à un lien de type [[note]] ou
            // une URL), ce qui casserait notre propre logique de clic.
            // Calcule le nombre d'occurrences EXACTES dans le contenu
            // d'origine (on recherche la chaîne littérale `**term**`).
            const literal = `**${term}**`;
            const countRegex = new RegExp(escapeRegExp(literal), 'g');
            const count = (content.match(countRegex) || []).length;

            const itemText = count > 1 ? `${term} (${count})` : term;
            const item = li.createEl('span', { text: itemText, cls: 'bold-index-item' });
            item.style.cursor = 'pointer';
            // var(--text-accent) : variable CSS du thème Obsidian, pour que
            // la couleur s'adapte automatiquement au thème clair/sombre choisi.
            item.style.color = 'var(--text-accent)';
            item.style.textDecoration = 'underline';

            // Au clic : on stoppe la propagation (pour éviter de déclencher
            // d'autres gestionnaires de clic parents), puis on délègue toute
            // la logique de navigation à jumpToTerm().
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.jumpToTerm(term);
            });
        });
    }
}

/**
 * BoldIndexPlugin
 * ---------------
 * Classe principale du plugin (point d'entrée reconnu par Obsidian via
 * manifest.json -> "main": "main.js"). Responsable de :
 *   - enregistrer le type de vue BoldIndexView auprès du workspace,
 *   - exposer une commande palette pour ouvrir/révéler le panneau.
 */
module.exports = class BoldIndexPlugin extends Plugin {
    /**
     * onload()
     * Appelé une fois par Obsidian au chargement du plugin (activation,
     * démarrage de l'appli avec le plugin déjà actif, etc.).
     */
    async onload() {
        // Enregistre notre type de vue : à chaque fois qu'Obsidian a besoin
        // de créer un leaf de type VIEW_TYPE (ex: au clic sur la commande
        // ci-dessous, ou en restaurant une disposition de fenêtre sauvegardée),
        // il appellera cette factory avec le leaf concerné.
        this.registerView(VIEW_TYPE, (leaf) => new BoldIndexView(leaf));

        // Ajoute une commande accessible via la palette de commandes
        // (Ctrl/Cmd+P), permettant d'ouvrir le panneau à la demande.
        this.addCommand({
            id: 'open-bold-index',
            name: 'Ouvrir le panneau d\'index des mots en gras',
            callback: () => this.activateView()
        });
    }

    /**
     * activateView()
     * ---------------
     * Ouvre (ou révèle s'il existe déjà) le panneau d'index dans la sidebar
     * droite. Évite de dupliquer le panneau si l'utilisateur déclenche la
     * commande plusieurs fois.
     */
    async activateView() {
        const { workspace } = this.app;

        // Cherche si un leaf de notre type existe déjà quelque part dans
        // le workspace (ex: panneau déjà ouvert dans la sidebar droite).
        let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];

        if (!leaf) {
            // Aucun panneau existant : on en crée un nouveau dans la sidebar
            // droite (getRightLeaf(false) = ne pas forcer la création d'un
            // split supplémentaire si un panneau y existe déjà).
            leaf = workspace.getRightLeaf(false);
            // Associe ce leaf fraîchement créé à notre type de vue, et le
            // marque comme actif dès sa création.
            await leaf.setViewState({ type: VIEW_TYPE, active: true });
        }

        // Rend le panneau visible à l'écran (déplie la sidebar si besoin,
        // amène l'onglet au premier plan).
        workspace.revealLeaf(leaf);
    }
};
