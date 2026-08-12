import { Plugin, ItemView } from 'obsidian';
import { IndexController } from './application/IndexController';

const VIEW_TYPE = 'bold-index-view';

class BoldIndexView extends ItemView {
  private readonly controller: IndexController;

  constructor(leaf: any) {
    super(leaf);
    this.controller = new IndexController(this.app);
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Index Lexical'; }
  getIcon() { return 'list-ordered'; }

  async onOpen() {
    this.registerEvent(this.app.workspace.on('file-open', () => this.update()));
    this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    this.update();
  }

  jumpToOffset(offset: number, length: number) {
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === activeFile.path);
    if (!targetLeaf) return;

    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    let fromPos: any;
    let toPos: any;

    if (offset <= docText.length - 1) {
      fromPos = editor.offsetToPos(offset);
      toPos = editor.offsetToPos(Math.min(offset + length, docText.length));
    } else {
      const fragment = docText.slice(0, Math.min(200, docText.length));
      const found = docText.indexOf(fragment);
      if (found === -1) return;
      fromPos = editor.offsetToPos(found);
      toPos = editor.offsetToPos(found + fragment.length);
    }

    editor.setSelection(fromPos, toPos);
    editor.scrollIntoView({ from: fromPos, to: toPos }, true);
    editor.focus();
  }

  async update() {
    const container = this.containerEl.children[1];
    await this.controller.render(container, (offset, length) => this.jumpToOffset(offset, length));
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
