import { Plugin, ItemView } from 'obsidian';
import { IndexController } from './application/IndexController';

// A unique identifier used to register the custom panel in Obsidian's workspace.
// This view type is what allows Obsidian to instantiate and manage the custom sidebar panel as a
// first-class element of the app, alongside standard tabs and panes.
const VIEW_TYPE = 'bold-index-view';

// This class acts as the bridge between Obsidian's view lifecycle and the plugin's business logic.
// It owns the controller and refreshes the index whenever the user opens a file or edits the note,
// which keeps the sidebar synchronized with the currently active markdown document.
class BoldIndexView extends ItemView {
  // The controller is responsible for reading the active file, parsing markdown emphasis, and
  // preparing the data that will be rendered in the sidebar. By isolating it here, the view stays
  // focused on DOM concerns and on UI-level interactions.
  private readonly controller: IndexController;

  constructor(leaf: any) {
    super(leaf);
    // The controller receives the full Obsidian app instance so it can access the active file,
    // vault, and editor state without the view needing to know too much about the application internals.
    this.controller = new IndexController(this.app);
  }

  // Obsidian expects a view to expose a stable identifier. This allows the plugin to re-create,
  // reveal, and restore the same panel consistently across workspace sessions.
  getViewType() { return VIEW_TYPE; }

  // The user-facing name displayed in the sidebar header. It is intentionally simple and readable.
  getDisplayText() { return 'Index Lexical'; }

  // The icon shown in the panel header to make the custom view visually recognizable.
  getIcon() { return 'list-ordered'; }

  // This hook is called when the sidebar pane is opened. We register listeners so the visual index
  // updates automatically whenever the active document or the editor content changes.
  async onOpen() {
    this.registerEvent(this.app.workspace.on('file-open', () => this.update()));
    this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    this.update();
  }

  // Moves the cursor to the exact emphasized occurrence selected by the user in the index.
  // The method locates the active markdown leaf, focuses the corresponding editor, and highlights the
  // matching fragment in the document so the sidebar behaves like a true navigation aid.
  jumpToOffset(offset: number, length: number) {
    // The plugin searches among all markdown leaves to find the editor that matches the currently
    // active file. Once found, it can move the selection and scroll to the wanted offset.
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const targetLeaf = markdownLeaves.find((leaf: any) => leaf.view?.file?.path === activeFile.path);
    if (!targetLeaf) return;

    // Focus the editor instance that owns the current note so the match can be selected in context.
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const editor = targetLeaf.view.editor;
    const docText = editor.getValue();
    let fromPos: any;
    let toPos: any;

    // If the target offset still falls within the document range, we highlight the exact emphasized
    // fragment. This makes the navigation more precise and more stable for the end user.
    if (offset <= docText.length - 1) {
      fromPos = editor.offsetToPos(offset);
      toPos = editor.offsetToPos(Math.min(offset + length, docText.length));
    } else {
      // In rare edge cases, the offset can be slightly outside the current file length. When that
      // happens we fall back to a shortened fragment near the start of the document to keep the
      // selection safe and avoid crashes.
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

  // Rebuilds the list of index entries for the active note and sends navigation callbacks to the view.
  // This method is the synchronization point between the sidebar UI and the controller.
  async update() {
    const container = this.containerEl.children[1];
    await this.controller.render(container, (offset, length) => this.jumpToOffset(offset, length));
  }
}

// The main plugin class is loaded once by Obsidian and is responsible for registering the custom
// sidebar view and making it available from the command palette.
export default class BoldIndexPlugin extends Plugin {
  // Initializes the plugin by registering the view type and the command used to reveal it.
  async onload() {
    // Obsidian must know how to create an instance of our custom view when the user opens it.
    this.registerView(VIEW_TYPE, (leaf: any) => new BoldIndexView(leaf));

    // This command exposes the panel to users without requiring them to know the internal view type.
    this.addCommand({
      id: 'open-bold-index',
      name: "Ouvrir le panneau d'index des mots en gras",
      callback: () => this.activateView()
    });
  }

  // Opens or creates the custom sidebar view. This ensures the panel appears in a predictable place
  // and is reusable without creating multiple copies of the same interface.
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];

    if (!leaf) {
      // If the sidebar pane does not yet exist, we create a new right-side leaf and attach the view.
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }

    workspace.revealLeaf(leaf);
  }
}
