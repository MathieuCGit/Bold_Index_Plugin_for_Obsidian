# Bold Index Navigation

## 1) What the plugin does

This plugin adds a sidebar panel in Obsidian that reads the current note and builds a clickable index of all bold terms found in it.

Example:

- You write: `**Project**`, `**Planning**`, `**Architecture**`
- The plugin scans the note and displays them in a list
- Clicking a term brings you directly to that location in the note
- The editor scrolls and selects the matching section

In practice, the plugin is useful when you want to quickly navigate a long note that contains many important concepts marked in bold.

It is especially helpful for notes that behave like glossaries, concept maps, planning pages, or knowledge bases.

### Simple user flow

    Obsidian workspace
        |
        | file-open / editor-change
        v
    Plugin reads active note
        |
        | finds all **...** patterns
        v
    Builds alphabetical list of terms
        |
        | user clicks a line or term
        v
    Opens the correct markdown view and focuses the highlighted location

### Current behavior

- Reads the active Markdown file only
- Ignores bold text inside code blocks and inline code
- Deduplicates repeated entries
- Shows the line number for each term occurrence
- Lets the user click a line to jump to the exact location in the editor

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
            |-- markdownIndex.test.ts

### Architectural approach

The codebase follows a lightweight separation of concerns inspired by MVC and domain-driven organization.

- Domain layer
  - Handles text analysis and index construction
  - Pure logic, no DOM, no Obsidian API dependency
  - Example: `buildBoldIndex(content)`

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
    | asks domain logic     |
    +----------+------------+
               |
               v
    +-----------------------+
    | markdownIndex.ts      |
    | parse bold terms      |
    | build index entries   |
    +----------+------------+
               |
               v
    +-----------------------+
    | IndexView             |
    | render list           |
    | clickable entries     |
    +-----------------------+

### Key responsibilities

#### `src/domain/markdownIndex.ts`

This is the business logic layer.

It does the following:

- scans raw Markdown text
- detects `**...**` patterns
- ignores content inside code blocks
- ignores inline code fragments
- groups terms by occurrence
- sorts them alphabetically
- keeps only the first occurrence per line for display clarity

This part is intentionally isolated so it can be tested without relying on Obsidian.

#### `src/ui/IndexView.ts`

This file handles UI rendering.

It is responsible for:

- clearing the container
- creating the title
- creating the list of terms
- creating clickable entries for each line number
- sending navigation events to the controller

#### `src/application/IndexController.ts`

This class coordinates interaction between the view and the domain logic.

It:

- gets the current file from the workspace
- reads the file content
- asks the domain code to build the index
- passes the prepared data to the view
- handles navigation callbacks

### Why this structure is useful

This small modular layout keeps the project maintainable as it grows.

It helps because:

- domain logic stays isolated and easier to test
- UI rendering is separated from data processing
- future filters and buttons can be added in a consistent way
- the project remains readable for new contributors

### Testing strategy

Unit tests are focused on the pure domain logic, especially the parser and the filtering rules.

The tests live in:

- `tests/domain/markdownIndex.test.ts`

They validate:

- extraction of bold terms
- ordering of results
- handling of code blocks
- empty input behavior
- duplicate handling on the same line

### Notes

This plugin is intentionally lightweight and focused. It does not try to be a full note index engine; it only extracts and exposes bold terms from the current file.

That choice keeps the code simple, fast, and easy to extend.
