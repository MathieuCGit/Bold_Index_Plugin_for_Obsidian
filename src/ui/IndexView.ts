import { BoldIndexEntry, filterBoldIndexEntries } from '../domain/markdownIndex';

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

    const searchInput = container.createEl('input', {
      type: 'text',
      cls: 'bold-index-search-input',
      placeholder: 'Filtrer...'
    });
    searchInput.style.width = '100%';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.marginBottom = '8px';

    const resultsContainer = container.createEl('div');

    const renderEntries = (query: string): void => {
      const filteredEntries = filterBoldIndexEntries(entries, query);
      resultsContainer.empty();

      if (entries.length === 0) {
        this.renderEmpty(resultsContainer, 'Aucun mot en gras.');
        return;
      }

      if (filteredEntries.length === 0) {
        this.renderEmpty(resultsContainer, 'Aucun résultat.');
        return;
      }

      const list = resultsContainer.createEl('ul', { cls: 'bold-index-list' });
      list.style.listStyle = 'none';
      list.style.paddingLeft = '0';

      filteredEntries.forEach((entry) => {
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
    };

    searchInput.addEventListener('input', (event: any) => {
      renderEntries(event.target.value ?? '');
    });

    renderEntries('');
  }
}
