import { buildBoldIndex, BoldIndexEntry, buildMarkdownIndexDocument, FormatMode } from '../domain/markdownIndex';
import { IndexView } from '../ui/IndexView';

// This callback is passed from the custom sidebar view to the controller whenever the user clicks
// a line number. It is responsible for moving the editor focus to the exact occurrence represented
// by the clicked index entry.
export type IndexNavigationHandler = (offset: number, length: number) => void;

// This controller is the orchestrator of the feature: it reads the active note, asks the domain
// parser to build the index, passes the result to the view, and handles UI actions such as filtering,
// navigation, and markdown export. It keeps the domain logic independent from Obsidian-specific code.
export class IndexController {
  private readonly view: IndexView;
  private selectedModes: FormatMode[] = ['bold'];

  constructor(private readonly app: any) {
    // The view is the presentation layer. It knows how to render the filter buttons, the search box,
    // and the clickable list, while the controller decides which data to display.
    this.view = new IndexView(this.app);
  }

  // Updates the active emphasis modes. The controller stores the current selection because the same
  // note may be re-rendered several times while the user toggles filters.
  setModes(modes: FormatMode[]): void {
    this.selectedModes = modes.length > 0 ? modes : ['bold'];
  }

  // Reads the current markdown note and refreshes the sidebar panel using the selected format modes.
  // The method also wires the export and open actions to callbacks so the view can trigger them
  // without directly depending on the vault API.
  async render(container: any, onNavigate: IndexNavigationHandler): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      // Obsidian may expose a workspace without any active file, such as before a note is opened.
      // In that case the sidebar should stay explicit instead of failing silently.
      this.view.renderEmpty(container, 'Aucune note ouverte.');
      return;
    }

    // The controller asks the vault for the note content and then builds the lexical list using the
    // currently selected emphasis rules. The result is finally passed to the view for DOM rendering.
    const content = await this.app.vault.read(activeFile);
    const entries = buildBoldIndex(content, this.selectedModes);

    // The actual rendering is delegated to the view, while the controller keeps ownership of the
    // state and callback chain. This separation keeps the UI code easier to maintain.
    this.view.render(container, activeFile.basename, entries, onNavigate, this.selectedModes, (modes) => {
      this.setModes(modes);
      this.render(container, onNavigate);
    }, () => this.exportCurrentIndex(), () => this.openCurrentExport());
  }

  // Exports the current index as a markdown file next to the active note.
  // The generated file uses the same emphasis selection currently active in the sidebar, so the export
  // reflects the exact content the user is viewing in the panel. Once the file is written, we also
  // open it automatically so the user can review or edit the export immediately.
  async exportCurrentIndex(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    const content = await this.app.vault.read(activeFile);
    const entries = buildBoldIndex(content, this.selectedModes);
    const exportName = `${this.sanitizeFileName(activeFile.basename)}_index.md`;
    const exportPath = `${activeFile.parent?.path ? activeFile.parent.path + '/' : ''}${exportName}`;
    const document = buildMarkdownIndexDocument(activeFile.basename, entries);
    const existing = this.app.vault.getAbstractFileByPath(exportPath);

    if (existing) {
      // If the export file already exists, we replace its content instead of creating a duplicate file.
      await this.app.vault.modify(existing as any, document);
      await this.openFileByPath(exportPath);
      return;
    }

    // If the file does not yet exist, we create it in the same folder as the current note.
    const created = await this.app.vault.create(exportPath, document);
    await this.openFileByPath(created.path);
  }

  // Opens the export file in a new or existing Obsidian leaf, which allows the user to immediately
  // inspect the generated markdown document after the export operation finishes.
  async openCurrentExport(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    const exportName = `${this.sanitizeFileName(activeFile.basename)}_index.md`;
    const exportPath = `${activeFile.parent?.path ? activeFile.parent.path + '/' : ''}${exportName}`;
    await this.openFileByPath(exportPath);
  }

  private async openFileByPath(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      return;
    }

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.openFile(file as any);
  }

  // Sanitizes a note title so it can be safely used as part of a filename.
  // We remove reserved characters and replace whitespace with hyphens to produce a predictable file name.
  private sanitizeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|\[\]]+/g, '').replace(/\s+/g, '-');
  }

  // Convenience method for tests and reuse: it exposes the parser output in a simple form without
  // going through the UI or the Obsidian workspace layer.
  buildEntries(content: string, modes: FormatMode[] = ['bold']): BoldIndexEntry[] {
    return buildBoldIndex(content, modes);
  }
}
