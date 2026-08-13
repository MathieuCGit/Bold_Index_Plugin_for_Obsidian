import { buildBoldIndex, BoldIndexEntry, FormatMode } from '../domain/markdownIndex';
import { IndexView } from '../ui/IndexView';

// Called when the user clicks a line number inside the index. It must move the editor selection to that formatted occurrence.
export type IndexNavigationHandler = (offset: number, length: number) => void;

// Acts as the orchestrator between the active note, the markdown parser, and the sidebar view.
export class IndexController {
  private readonly view: IndexView;
  private selectedModes: FormatMode[] = ['bold'];

  constructor(private readonly app: any) {
    // The view is responsible for drawing the list, toggles, and search input.
    this.view = new IndexView(this.app);
  }

  setModes(modes: FormatMode[]): void {
    this.selectedModes = modes.length > 0 ? modes : ['bold'];
  }

  // Reads the current note, builds the formatted index, and forwards the result to the view.
  async render(container: any, onNavigate: IndexNavigationHandler): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      // If no file is open, we keep the UI explicit and show a useful message.
      this.view.renderEmpty(container, 'Aucune note ouverte.');
      return;
    }

    // Read the raw markdown content so the parser can extract formatted terms and their positions.
    const content = await this.app.vault.read(activeFile);
    const entries = buildBoldIndex(content, this.selectedModes);

    // Render the title and the filtered list of matches.
    this.view.render(container, activeFile.basename, entries, onNavigate, this.selectedModes, (modes) => {
      this.setModes(modes);
      this.render(container, onNavigate);
    });
  }

  // Convenience method for tests and reuse: returns the same index as the parser itself.
  buildEntries(content: string, modes: FormatMode[] = ['bold']): BoldIndexEntry[] {
    return buildBoldIndex(content, modes);
  }
}
