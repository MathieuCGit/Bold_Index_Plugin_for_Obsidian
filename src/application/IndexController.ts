import { buildBoldIndex, BoldIndexEntry } from '../domain/markdownIndex';
import { IndexView } from '../ui/IndexView';

export type IndexNavigationHandler = (offset: number, length: number) => void;

export class IndexController {
  private readonly view: IndexView;

  constructor(private readonly app: any) {
    this.view = new IndexView(this.app);
  }

  async render(container: any, onNavigate: IndexNavigationHandler): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.view.renderEmpty(container, 'Aucune note ouverte.');
      return;
    }

    const content = await this.app.vault.read(activeFile);
    const entries = buildBoldIndex(content);
    this.view.render(container, activeFile.basename, entries, onNavigate);
  }

  buildEntries(content: string): BoldIndexEntry[] {
    return buildBoldIndex(content);
  }
}
