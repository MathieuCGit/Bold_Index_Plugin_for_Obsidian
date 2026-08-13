import { ALL_FORMAT_MODES, BoldIndexEntry, filterBoldIndexEntries, FormatMode } from '../domain/markdownIndex';

// This callback is invoked when the user clicks one of the line numbers displayed next to a term.
// The offset is the exact position in the markdown document, and the length is used to select the
// matching emphasized fragment in the editor so the user lands exactly on the relevant text.
export type NavigationCallback = (offset: number, length: number) => void;

// This callback is triggered whenever the user toggles one of the format filters in the sidebar.
// It allows the parent controller to refresh the index using the newly selected emphasis modes.
export type IndexModeChangeCallback = (modes: FormatMode[]) => void;

// This class is responsible for all rendering work inside the custom Obsidian view.
// It creates the filter buttons, the search box, the empty state, and the clickable list of terms
// that are extracted from the current note. It keeps the DOM logic separate from the parsing logic,
// which makes the code far easier to reason about and test.
export class IndexView {
  constructor(private readonly app: any) {}

  // Displays a friendly message when there is no active file or when the current note does not
  // contain any matches for the selected emphasis modes. This keeps the sidebar explicit instead of
  // leaving the user with a blank panel.
  renderEmpty(container: any, message: string): void {
    container.empty();
    container.createEl('p', { text: message, cls: 'pane-empty' });
  }

  // Renders the full sidebar interface for the current note.
  // The panel begins with the note title, then the export button, then the mode filters, then the
  // live search input and the result list. We pass callbacks to keep the UI decoupled from the
  // controller and avoid hard-coding the actual navigation logic directly in the DOM layer.
  render(
    container: any,
    title: string,
    entries: BoldIndexEntry[],
    onNavigate: NavigationCallback,
    selectedModes: FormatMode[] = ['bold'],
    onModeChange?: IndexModeChangeCallback,
    onExport?: () => void,
    onOpenExport?: () => void
  ): void {
    container.empty();
    container.createEl('h4', { text: title });

    // The action bar keeps the export and open actions aligned to the right and keeps the panel
    // visually compact while still exposing both primary operations for the user.
    const actionsBar = container.createEl('div', { cls: 'bold-index-actions-bar' });
    actionsBar.style.display = 'flex';
    actionsBar.style.justifyContent = 'flex-end';
    actionsBar.style.alignItems = 'center';
    actionsBar.style.gap = '6px';
    actionsBar.style.marginBottom = '8px';

    const exportButton = actionsBar.createEl('button', { text: 'Exporter .md' });
    exportButton.type = 'button';
    exportButton.addEventListener('click', () => onExport?.());

    const openExportButton = actionsBar.createEl('button', { text: 'Ouvrir le fichier' });
    openExportButton.type = 'button';
    openExportButton.addEventListener('click', () => onOpenExport?.());

    // The mode toggles are cumulative: the user can enable or disable any combination of bold,
    // italic, and highlight. This is necessary because the parser supports multiple markdown
    // emphasis styles at the same time and the panel should reflect that behavior directly.
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

      // Toggling a filter updates the active set of modes. If all filters were removed, the plugin
      // preserves a sensible default by re-enabling bold mode to avoid an empty and confusing index.
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

    // The search box gives the user a quick way to narrow the index without rebuilding the full note.
    // It filters the list in real time using the underlying data already computed in the controller.
    const searchInput = container.createEl('input', {
      type: 'text',
      cls: 'bold-index-search-input',
      placeholder: 'Filtrer...'
    });
    searchInput.style.width = '100%';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.marginBottom = '8px';

    // The result container is kept separate so the code can rerender only the list when the query
    // changes instead of recreating a large part of the whole panel each time.
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

          // Each line number acts as a clickable anchor in the note. When selected, it jumps to the
          // exact text range matching the emphasis pattern in the editor, which makes the sidebar
          // behave more like a true navigation index than a simple list.
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

    // The live filter is updated on every keystroke so the user sees the list narrow in real time
    // without needing to reload or re-open the panel.
    searchInput.addEventListener('input', (event: any) => {
      renderEntries(event.target.value ?? '');
    });

    renderEntries('');
  }
}
