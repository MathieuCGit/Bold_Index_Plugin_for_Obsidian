# Bold Index Navigation

## 1) What the plugin does

This plugin adds a sidebar panel in Obsidian that reads the current note and builds a clickable index of formatted terms found in it.

It currently supports multiple markdown emphasis modes simultaneously:

- bold: `**word**`
- italic: `*word*` or `_word_`
- highlight: `==word==`

Example:

- You write: `**Project**`, `*Planning*`, `==Architecture==`
- The plugin scans the note and displays the matching terms in a list
- Clicking a term brings you directly to that location in the note
- The editor scrolls and selects the matching section

In practice, the plugin is useful when you want to quickly navigate a long note that contains many important concepts marked with emphasis.

It is especially helpful for notes that behave like glossaries, concept maps, planning pages, or knowledge bases.

### Simple user flow

    Obsidian workspace
        |
        | file-open / editor-change
        v
    Plugin reads active note
        |
        | finds all selected formatting patterns
        v
    Builds alphabetical list of terms
        |
        | user clicks a line or term
        v
    Opens the correct markdown view and focuses the highlighted location

### Current behavior

- Reads the active Markdown file only
- Ignores formatted text inside code blocks and inline code
- Supports cumulative mode selection: Bold + Italic + Highlight can be active together
- Deduplicates repeated entries per line
- Shows the line number for each term occurrence
- Lets the user click a line to jump to the exact location in the editor
- Includes a live text filter above the list to narrow results quickly

### User controls

The sidebar includes a set of toggle buttons above the list:

- Bold
- Italic
- Highlight

These buttons are cumulative, so you can activate several modes at once. For example, if Bold and Italic are enabled, the index will show both bold and italic entries together.

The search field filters the visible list in real time by term name, without changing the underlying index.

---

## 2) For developers

### Dependencies

This project is a small Obsidian plugin built with TypeScript and bundled with esbuild.

Main dependencies:

- Obsidian API
- TypeScript
- esbuild
- builtin-modules
- Vitest

Package scripts:

- `npm run dev` : starts the local esbuild watch mode
- `npm run build` : produces the bundled plugin file
- `npm test` : runs the unit tests

### Project structure

    .
    |-- main.ts
    |-- manifest.json
    |-- obsidian.d.ts
    |-- package.json
    |-- tsconfig.json
    |-- esbuild.config.mjs
    |-- vitest.config.ts
    |-- .gitignore
    |-- src/
    |   |-- main.ts
    |   |-- application/
    |   |   |-- IndexController.ts
    |   |-- domain/
    |   |   |-- markdownIndex.ts
    |   |-- ui/
    |       |-- IndexView.ts
    |-- tests/
        |-- domain/
            |-- buildBoldIndex.test.ts
            |-- filterBoldIndexEntries.test.ts

### Architectural approach

The codebase follows a lightweight separation of concerns inspired by MVC and domain-driven organization.

- Domain layer
  - Handles text analysis and index construction
  - Pure logic, no DOM, no Obsidian API dependency
  - Example: `buildBoldIndex(content, modes)`

- Application layer
  - Coordinates the flow between data and UI
  - Example: `IndexController`

- UI layer
  - Creates the sidebar DOM and renders clickable entries
  - Example: `IndexView`

- Plugin bootstrap
  - Registers the custom Obsidian view and command
  - Example: `BoldIndexPlugin` in `src/main.ts`

### Runtime flow

    +-----------------------+
    | Obsidian workspace    |
    +----------+------------+
               |
               | file-open / editor-change
               v
    +-----------------------+
    | BoldIndexPlugin       |
    | registerView()        |
    | addCommand()          |
    +----------+------------+
               |
               v
    +-----------------------+
    | BoldIndexView         |
    | onOpen()              |
    | update()              |
    +----------+------------+
               |
               | read active note
               v
    +-----------------------+
    | IndexController       |
    | fetches note content  |
    | selects current modes |
    | asks domain logic     |
    +----------+------------+
               |
               v
    +-----------------------+
    | markdownIndex.ts      |
    | parse selected modes  |
    | build index entries   |
    +----------+------------+
               |
               v
    +-----------------------+
    | IndexView             |
    | render mode toggles   |
    | render search field   |
    | clickable entries     |
    +-----------------------+

### Key responsibilities

#### `src/domain/markdownIndex.ts`

This is the business logic layer.

It does the following:

- scans raw Markdown text
- detects selected formatting patterns such as `**...**`, `*...*`, `_..._`, and `==...==`
- ignores content inside code blocks
- ignores inline code fragments
- groups terms by occurrence
- supports cumulative active modes via `FormatMode[]`
- sorts terms alphabetically
- keeps only the first occurrence per line for display clarity

This part is intentionally isolated so it can be tested without relying on Obsidian.

#### `src/ui/IndexView.ts`

This file handles UI rendering.

It is responsible for:

- clearing the container
- creating the title
- creating the mode toggle buttons
- creating the search input
- creating the list of terms
- creating clickable entries for each line number
- sending navigation events to the controller

#### `src/application/IndexController.ts`

This class coordinates interaction between the view and the domain logic.

It:

- gets the current file from the workspace
- reads the file content
- keeps the current selected formatting modes
- asks the domain code to build the index
- passes the prepared data to the view
- handles navigation callbacks

### Why this structure is useful

This small modular layout keeps the project maintainable as it grows.

It helps because:

- domain logic stays isolated and easier to test
- UI rendering is separated from data processing
- format modes can be extended without rewriting the whole flow
- the project remains readable for new contributors

### Testing strategy

Unit tests are focused on the pure domain logic, especially the parser and the filtering rules.

The tests live in:

- `tests/domain/buildBoldIndex.test.ts`
- `tests/domain/filterBoldIndexEntries.test.ts`

They validate:

- extraction of formatted terms
- ordering of results
- handling of code blocks
- empty input behavior
- duplicate handling on the same line
- cumulative mode behavior for bold, italic, and highlight
- case-insensitive filtering by search query

### Notes

This plugin is intentionally lightweight and focused. It does not try to be a full note index engine; it only extracts and exposes bold terms from the current file.

That choice keeps the code simple, fast, and easy to extend.
