import { Plugin, ItemView } from 'obsidian';
import { IndexController } from './application/IndexController';

// Unique identifier used to register the custom sidebar view inside Obsidian.
const VIEW_TYPE = 'bold-index-view';

// The sidebar panel that displays the generated index of bold terms.
// It acts as the bridge between the Obsidian view lifecycle and the controller that builds the index.
class BoldIndexView extends ItemView {
  // Controller responsible for reading the current note and rendering the index entries.
  private readonly controller: IndexController;

  constructor(leaf: any) {
    super(leaf);
    // The controller receives the full app instance and uses it to read the active file and vault content.
    this.controller = new IndexController(this.app);
  }

  // Required by Obsidian to identify the custom view type.
  getViewType() { return VIEW_TYPE; }

  // Human-readable name shown in the sidebar and UI.
  getDisplayText() { return 'Index Lexical'; }

  // Icon displayed next to the view title in the sidebar.
  getIcon() { return 'list-ordered'; }

  // Called when the sidebar view is opened.
  // We register listeners so the index refreshes when the active file or editor content changes.
  async onOpen() {
    this.registerEvent(this.app.workspace.on('file-open', () => this.update()));
    this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    this.update();
  }

  // Moves the cursor to the matching location of a bold term inside the active markdown editor.
  // This is used when the user clicks a line number in the index.
  jumpToOffset(offset: number, length: number) {
    // Find the markdown leaf that belongs to the currently active file.
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === activeFile.path);
    if (!targetLeaf) return;

    // Focus the editor containing the active file.
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    let fromPos: any;
    let toPos: any;

    // If the target offset is still inside the document, highlight the bold fragment directly.
    if (offset <= docText.length - 1) {
      fromPos = editor.offsetToPos(offset);
      toPos = editor.offsetToPos(Math.min(offset + length, docText.length));
    } else {
      // Fallback for edge cases where the offset is beyond the current document length.
      // We attempt to keep the navigation stable by selecting a shortened fragment near the start of the file.
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

  // Rebuilds the list of index entries for the current active note.
  // The callback passed to the controller lets the UI navigate directly to the highlighted bold occurrence.
  async update() {
    const container = this.containerEl.children[1];
    await this.controller.render(container, (offset, length) => this.jumpToOffset(offset, length));
  }
}

// Main plugin class. Obsidian instantiates it once when the plugin loads.
export default class BoldIndexPlugin extends Plugin {
  // Registers the sidebar view and the command used to open it.
  async onload() {
    // Register the custom view type so Obsidian can create an instance of BoldIndexView.
    this.registerView(VIEW_TYPE, (leaf: any) => new BoldIndexView(leaf));

    // Adds a command in the command palette to open the bold index panel.
    this.addCommand({
      id: 'open-bold-index',
      name: "Ouvrir le panneau d'index des mots en gras",
      callback: () => this.activateView()
    });
  }

  // Opens or creates the custom sidebar view.
  // This keeps the plugin UX simple: the user can launch the panel from the command palette.
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];

    if (!leaf) {
      // Create a new right-side leaf if the plugin view does not already exist.
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }

    workspace.revealLeaf(leaf);
  }
}
