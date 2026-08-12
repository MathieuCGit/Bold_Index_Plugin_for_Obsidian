import { Plugin, ItemView, MarkdownView } from 'obsidian';

// This constant is the unique identifier of the custom panel added by the plugin.
// Obsidian uses this name to instantiate the view and to restore it when the app restarts.
// In plain terms: this is how the plugin tells the application "this is my custom right-sidebar view".
const VIEW_TYPE = 'bold-index-view';

// -----------------------------------------------------------------------------
// The custom view displayed in Obsidian's UI.
//
// Its job is simple but important: read the active Markdown note, collect every
// bold term found in that note, and display a clickable index of those terms in a
// sidebar panel. When the user clicks one of those terms, the plugin opens the note
// and moves the cursor to the matching location.
// -----------------------------------------------------------------------------
class BoldIndexView extends ItemView {
  linkedFile: any | null;
  constructor(leaf: any) {
    super(leaf);
    this.linkedFile = null;
  }

  // Obsidian uses these methods to identify the view in the UI and determine how
  // it should appear in the sidebar or tab system.
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Index Lexical'; }
  getIcon() { return 'list-ordered'; }

  // Called when the view is opened or shown for the first time.
  // This is where the plugin subscribes to workspace events so that the index stays in sync
  // with the document the user is currently reading.
  async onOpen() {
    // When the active file changes, rebuild the index for the new note.
    this.registerEvent(this.app.workspace.on('file-open', () => this.update()));
    // When the user edits the note, refresh the index so it reflects the latest text.
    this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    // Render immediately when the view opens.
    this.update();
  }

  // A helper method for jumping directly to a bold term inside the active note.
  // This is conceptually useful, although the current UI mainly uses jumpToOffset.
  // The idea is: find the Markdown leaf for the linked file, select the text matching
  // the bold term, and scroll it into view.
  jumpToTerm(term: string) {
    const file = this.linkedFile;
    if (!file) return;
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === file.path);
    if (!targetLeaf) return;
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    const targetText = `**${term}**`;
    const offset = docText.indexOf(targetText);
    if (offset !== -1) {
      const posFrom = editor.offsetToPos(offset);
      const posTo = editor.offsetToPos(offset + targetText.length);
      editor.setSelection(posFrom, posTo);
      editor.scrollIntoView({ from: posFrom, to: posTo }, true);
      editor.focus();
    }
  }

  // This method is used to move the editor to a specific character offset within the
  // note. It is more precise than jumpToTerm, because it can target a specific position
  // instead of searching for a literal text pattern.
  //
  // The logic works like this:
  // 1) identify the file associated with the current view,
  // 2) find its Markdown editor,
  // 3) convert the offset into a position object understood by CodeMirror/Obsidian,
  // 4) highlight the relevant range,
  // 5) scroll it into view and focus the editor.
  jumpToOffset(offset: number, length: number) {
    const file = this.linkedFile;
    if (!file) return;

    // Find the editor pane that is currently showing the same file.
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === file.path);
    if (!targetLeaf) return;

    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    let fromPos: any, toPos: any;

    // If the stored offset is still valid, select the exact range around it.
    if (offset <= docText.length - 1) {
      fromPos = editor.offsetToPos(offset);
      toPos = editor.offsetToPos(Math.min(offset + length, docText.length));
    } else {
      // Safety fallback: if the offset is invalid, select a short fragment near the top
      // of the document instead of crashing or doing nothing.
      const frag = docText.slice(0, Math.min(200, docText.length));
      const found = docText.indexOf(frag);
      if (found === -1) return;
      fromPos = editor.offsetToPos(found);
      toPos = editor.offsetToPos(found + frag.length);
    }

    editor.setSelection(fromPos, toPos);
    editor.scrollIntoView({ from: fromPos, to: toPos }, true);
    editor.focus();
  }

  // Main refresh routine for the index view.
  // This function rebuilds the panel content every time the active note or document text changes.
  async update() {
    // The view's container is a DOM-like tree. The second child is typically the section in
    // which custom panel content is appended.
    const container = this.containerEl.children[1];
    container.empty();

    // Ask Obsidian which file is currently active in the workspace.
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      // If no note is open, the plugin cannot index anything. We display a friendly empty state.
      container.createEl('p', { text: 'Aucune note ouverte.', cls: 'pane-empty' });
      return;
    }

    // Cache the active note so other methods can navigate back to it later.
    this.linkedFile = activeFile;

    // Create a small title within the panel to show which note is being indexed.
    container.createEl('h4', { text: activeFile.basename });

    // Read the raw markdown source of the active note from the vault.
    // This is necessary because the plugin must inspect the file text, not just the rendered preview.
    const content = await this.app.vault.read(activeFile);

    // The plugin searches for bold Markdown using a regex that matches **...**.
    // We intentionally exclude any match that is empty, because an empty bold token is not useful.
    const boldRegex = /\*\*(?!\*)(.*?)\*\*(?!\*)/g;

    // Some text should not be indexed because it is not visible content to the user:
    // fenced code blocks, tilde code blocks, and inline code snippets.
    // We record the character offsets covered by these blocks, then ignore bold matches
    // that fall inside them.
    const ignoreRanges: [number, number][] = [];
    const addRanges = (re: RegExp) => {
      for (const m of content.matchAll(re)) {
        if (typeof m.index === 'number') ignoreRanges.push([m.index, m.index + m[0].length]);
      }
    };

    addRanges(/```[\s\S]*?```/g);
    addRanges(/~~~[\s\S]*?~~~/g);
    addRanges(/`[^`]*`/g);

    // Returns true if a given character position falls inside a range that should be ignored.
    const isIgnored = (pos: number) => ignoreRanges.some(r => pos >= r[0] && pos < r[1]);

    // Map each bold term to all the offsets where it appears in the file.
    // This gives us a deduplicated structure such as:
    //   "project" => [offset1, offset2, offset3]
    // We later translate those offsets into line numbers for display.
    const termOffsets = new Map<string, number[]>();
    for (const m of content.matchAll(boldRegex)) {
      if (typeof m.index !== 'number') continue;

      const start = m.index;
      if (isIgnored(start)) continue;

      const term = m[1].trim();
      if (!term) continue;

      if (!termOffsets.has(term)) termOffsets.set(term, []);
      termOffsets.get(term)!.push(start);
    }

    // Sort terms alphabetically for a stable, readable index.
    const uniqueMatches = [...termOffsets.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
    if (uniqueMatches.length === 0) {
      container.createEl('p', { text: 'Aucun mot en gras.', cls: 'pane-empty' });
      return;
    }

    // The panel itself is a simple list. Each list item represents one bold term.
    const ul = container.createEl('ul', { cls: 'bold-index-list' });
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';

    // For each strong term, determine the lines where it appears and show those line numbers
    // as clickable elements. This makes the index useful as a navigation system.
    uniqueMatches.forEach(term => {
      const offsets = termOffsets.get(term) || [];
      if (offsets.length === 0) return;

      // We keep only the first occurrence of a term per line. This prevents the list from being
      // flooded with duplicate line numbers when the same word is repeated on the same line.
      const lineMap = new Map<number, number>();
      offsets.forEach(off => {
        const line = content.slice(0, off).split('\n').length;
        if (!lineMap.has(line)) lineMap.set(line, off);
      });

      const li = ul.createEl('li');
      li.style.marginBottom = '6px';

      const termSpan = li.createEl('span', { text: term, cls: 'bold-index-term' });
      termSpan.style.marginRight = '8px';

      const linesContainer = li.createEl('span', { cls: 'bold-index-lines' });
      const entries = [...lineMap.entries()].sort((a, b) => a[0] - b[0]);

      entries.forEach(([line, off], idx) => {
        const ln = linesContainer.createEl('span', { text: String(line), cls: 'bold-index-line' });
        ln.style.cursor = 'pointer';
        ln.style.color = 'var(--text-accent)';
        ln.style.textDecoration = 'underline';
        ln.style.marginRight = '6px';

        // When the user clicks a line number, we jump to the corresponding location in the note.
        // The plugin computes an approximate selection range around the bold expression.
        ln.addEventListener('click', (e: any) => {
          e.stopPropagation();
          const literalLen = term.length + 4;
          this.jumpToOffset(off, literalLen);
        });

        // Add a separator between multiple matching lines.
        if (idx < entries.length - 1) {
          const sep = linesContainer.createEl('span', { text: ',' });
          sep.style.marginRight = '6px';
        }
      });
    });
  }
}

// -----------------------------------------------------------------------------
// Plugin bootstrap.
//
// This is the object Obsidian instantiates when it loads the plugin. It is the top-level
// entry point. It registers the custom view type and adds a command to the command palette.
// The command lets the user open the panel manually, even if it is not automatically visible.
// -----------------------------------------------------------------------------
export default class BoldIndexPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf: any) => new BoldIndexView(leaf));
    this.addCommand({
      id: 'open-bold-index',
      name: "Ouvrir le panneau d'index des mots en gras",
      callback: () => this.activateView()
    });
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
