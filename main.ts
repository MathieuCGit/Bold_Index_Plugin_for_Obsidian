import { Plugin, ItemView, MarkdownView } from 'obsidian';

const VIEW_TYPE = 'bold-index-view';

class BoldIndexView extends ItemView {
  linkedFile: any | null;
  constructor(leaf: any) {
    super(leaf);
    this.linkedFile = null;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Index Lexical'; }
  getIcon() { return 'list-ordered'; }

  async onOpen() {
    this.registerEvent(this.app.workspace.on('file-open', () => this.update()));
    this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    this.update();
  }

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

  jumpToOffset(offset: number, length: number) {
    const file = this.linkedFile;
    if (!file) return;
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === file.path);
    if (!targetLeaf) return;
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    let fromPos: any, toPos: any;
    if (offset <= docText.length - 1) {
      fromPos = editor.offsetToPos(offset);
      toPos = editor.offsetToPos(Math.min(offset + length, docText.length));
    } else {
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

  async update() {
    const container = this.containerEl.children[1];
    container.empty();
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      container.createEl('p', { text: 'Aucune note ouverte.', cls: 'pane-empty' });
      return;
    }
    this.linkedFile = activeFile;
    container.createEl('h4', { text: activeFile.basename });
    const content = await this.app.vault.read(activeFile);

    const boldRegex = /\*\*(?!\*)(.*?)\*\*(?!\*)/g;
    const ignoreRanges: [number, number][] = [];
    const addRanges = (re: RegExp) => {
      for (const m of content.matchAll(re)) {
        if (typeof m.index === 'number') ignoreRanges.push([m.index, m.index + m[0].length]);
      }
    };
    addRanges(/```[\s\S]*?```/g);
    addRanges(/~~~[\s\S]*?~~~/g);
    addRanges(/`[^`]*`/g);
    const isIgnored = (pos: number) => ignoreRanges.some(r => pos >= r[0] && pos < r[1]);

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

    const uniqueMatches = [...termOffsets.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
    if (uniqueMatches.length === 0) {
      container.createEl('p', { text: 'Aucun mot en gras.', cls: 'pane-empty' });
      return;
    }

    const ul = container.createEl('ul', { cls: 'bold-index-list' });
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';

    uniqueMatches.forEach(term => {
      const offsets = termOffsets.get(term) || [];
      if (offsets.length === 0) return;
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
        ln.addEventListener('click', (e: any) => {
          e.stopPropagation();
          const literalLen = term.length + 4;
          this.jumpToOffset(off, literalLen);
        });
        if (idx < entries.length - 1) {
          const sep = linesContainer.createEl('span', { text: ',' });
          sep.style.marginRight = '6px';
        }
      });
    });
  }
}

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
