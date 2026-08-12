import { BoldIndexEntry } from '../domain/markdownIndex';

export type NavigationCallback = (offset: number, length: number) => void;

export class IndexView {
  constructor(private readonly app: any) {}

  renderEmpty(container: any, message: string): void {
    container.empty();
    container.createEl('p', { text: message, cls: 'pane-empty' });
  }

  render(container: any, title: string, entries: BoldIndexEntry[], onNavigate: NavigationCallback): void {
    container.empty();
    container.createEl('h4', { text: title });

    if (entries.length === 0) {
      this.renderEmpty(container, 'Aucun mot en gras.');
      return;
    }

    const list = container.createEl('ul', { cls: 'bold-index-list' });
    list.style.listStyle = 'none';
    list.style.paddingLeft = '0';

    entries.forEach((entry) => {
      const item = list.createEl('li');
      item.style.marginBottom = '6px';

      const term = item.createEl('span', { text: entry.term, cls: 'bold-index-term' });
      term.style.marginRight = '8px';

      const lines = item.createEl('span', { cls: 'bold-index-lines' });
      entry.occurrences.forEach((occurrence, index) => {
        const line = lines.createEl('span', {
          text: String(occurrence.line),
          cls: 'bold-index-line'
        });

        line.style.cursor = 'pointer';
        line.style.color = 'var(--text-accent)';
        line.style.textDecoration = 'underline';
        line.style.marginRight = '6px';

        line.addEventListener('click', (event: any) => {
          event.stopPropagation();
          const length = entry.term.length + 4;
          onNavigate(occurrence.offset, length);
        });

        if (index < entry.occurrences.length - 1) {
          const separator = lines.createEl('span', { text: ',' });
          separator.style.marginRight = '6px';
        }
      });
    });
  }
}
