import { ALL_FORMAT_MODES, BoldIndexEntry, filterBoldIndexEntries, FormatMode } from '../domain/markdownIndex';

// Called when the user clicks a line number associated with a formatted term in the sidebar.
export type NavigationCallback = (offset: number, length: number) => void;

export type IndexModeChangeCallback = (modes: FormatMode[]) => void;

// Renders the sidebar content for the formatted index.
// It is responsible for the search field, the filters, the empty state, and the visible list of terms and occurrences.
export class IndexView {
  constructor(private readonly app: any) {}

  // Shows the empty-state message when there is no note or no matching formatted term in the current file.
  renderEmpty(container: any, message: string): void {
    container.empty();
    container.createEl('p', { text: message, cls: 'pane-empty' });
  }

  // Main rendering function for the whole panel.
  // It creates the top filter buttons, search input, and redraws the list based on the current query and selected modes.
  render(
    container: any,
    title: string,
    entries: BoldIndexEntry[],
    onNavigate: NavigationCallback,
    selectedModes: FormatMode[] = ['bold'],
    onModeChange?: IndexModeChangeCallback
  ): void {
    container.empty();
    container.createEl('h4', { text: title });

    // Toggle buttons displayed above the list. They are cumulative: several modes can be active at the same time.
    const modeBar = container.createEl('div', { cls: 'bold-index-mode-bar' });
    modeBar.style.display = 'flex';
    modeBar.style.gap = '6px';
    modeBar.style.marginBottom = '8px';
    modeBar.style.flexWrap = 'wrap';

    const modeButtons = new Map<FormatMode, any>();

    ALL_FORMAT_MODES.forEach((mode) => {
      const button = modeBar.createEl('button', {
        text: mode === 'bold' ? 'Bold' : mode === 'italic' ? 'Italic' : 'Highlight',
        cls: 'mod-cta'
      });

      const isActive = selectedModes.includes(mode);
      button.setAttribute('aria-pressed', String(isActive));
      button.style.opacity = isActive ? '1' : '0.6';
      button.style.border = isActive ? '1px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';

      modeButtons.set(mode, button);

      button.addEventListener('click', () => {
        const currentModes = new Set(selectedModes);
        if (currentModes.has(mode)) {
          currentModes.delete(mode);
        } else {
          currentModes.add(mode);
        }

        const nextModes = [...currentModes];
        if (nextModes.length === 0) {
          nextModes.push('bold');
        }

        modeButtons.forEach((btn, key) => {
          const active = nextModes.includes(key);
          btn.setAttribute('aria-pressed', String(active));
          btn.style.opacity = active ? '1' : '0.6';
          btn.style.border = active ? '1px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
        });

        onModeChange?.(nextModes);
      });
    });

    // Search box displayed above the index list.
    const searchInput = container.createEl('input', {
      type: 'text',
      cls: 'bold-index-search-input',
      placeholder: 'Filtrer...'
    });
    searchInput.style.width = '100%';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.marginBottom = '8px';

    // This container is reused when the query changes so that the list can be refreshed without re-rendering the whole panel.
    const resultsContainer = container.createEl('div');

    const renderEntries = (query: string): void => {
      const filteredEntries = filterBoldIndexEntries(entries, query);
      resultsContainer.empty();

      if (entries.length === 0) {
        this.renderEmpty(resultsContainer, 'Aucun mot formaté.');
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

    // Live filtering: each keystroke updates the visible list.
    searchInput.addEventListener('input', (event: any) => {
      renderEntries(event.target.value ?? '');
    });

    renderEntries('');
  }
}
