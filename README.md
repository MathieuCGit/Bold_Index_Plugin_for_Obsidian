# 📑 Navigation Index for Obsidian

**Transform long notes into instantly searchable, interactive glossaries.**

A powerful Obsidian plugin that scans your notes, builds a dynamic index of formatted terms (bold, italic, highlight), and lets you navigate to them with a single click. Perfect for knowledge bases, planning documents, and concept maps.

[🇫🇷 Version française](#) | [🐛 Report Bug](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian/issues) | [⭐ Star on GitHub](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian)

---

## The Problem

Large, detailed notes are powerful but hard to navigate. Scrolling to find a specific concept takes time, and you often lose context about where key terms are located in your document.

## The Solution

Navigation Index automatically extracts formatted terms from your note and displays them in an interactive sidebar panel. Click any term to jump directly to it, with the editor automatically selecting the exact text.

---

## ✨ Key Features

- 🎯 **Multi-format support** - Index bold, italic, and highlight formatting simultaneously
- 🔄 **Cumulative filtering** - Toggle B, I, H buttons to show only the terms you need
- 📍 **Instant navigation** - Click line numbers to jump directly to terms in your note
- 🔍 **Live search** - Filter results as you type without rebuilding the index
- 📊 **Smart sorting** - View terms alphabetically (default) or by document order (line numbers)
- 📤 **Export to Markdown** - Save the index as a separate markdown file for sharing
- 🚀 **Lightning fast** - Real-time updates as you edit your note
- 🛡️ **Code-aware** - Automatically ignores formatted text inside code blocks and inline code
- 📱 **Responsive** - Compact sidebar design that fits any workspace layout

---

## 🚀 Quick Start

### Installation

1. Open Obsidian → **Settings → Community plugins**
2. Click **Disable Safe Mode** (if prompted)
3. Click **Browse** and search for "**Navigation Index**"
4. Click **Install**, then **Enable**
5. The sidebar panel appears automatically in your workspace

### Your First Index

Open any note with formatted terms:

```markdown
# Project Planning

## Overview
This project involves **three main phases**: **design**, **development**, and *deployment*.

## Key Concepts
- **Architecture**: The system uses a microservices approach
- *API Layer*: REST endpoints for external integration
- ==Critical Path==: Must complete design before development

## Timeline
- **Phase 1** (weeks 1-2): Research and **planning**
- **Phase 2** (weeks 3-8): *Implementation* and testing
- **Phase 3** (weeks 9-10): ==Deployment== and monitoring
```

The plugin automatically builds an index in the sidebar with all formatted terms, ready to navigate.

---

## 🎯 Features in Detail

### 1. Format Mode Filtering

Choose which formatting styles to index:

- **B** (Bold) - `**term**`
- **I** (Italic) - `*term*` or `_term_`
- **H** (Highlight) - `==term==`

You can combine any mix. If you disable all modes, bold automatically re-enables as a safety default.

![Sidebar with B, I, H filter buttons - placeholder]

### 2. Smart Sorting

Click the **Sort** button (after B, I, H buttons) to choose how entries are ordered:

- **A↓** (Alphabetical) - Natural A-Z order using French locale, default choice
- **L↓** (By Line) - Document order, organized by where terms first appear

The plugin remembers your choice across note switches.

![Sort menu dropdown showing Alphabetical and By Line options - placeholder]

### 3. Live Search

Type in the search box to instantly filter results. The search is:
- **Case-insensitive** - Type naturally
- **Partial match** - "arch" finds "Architecture" and "Monarch"
- **Instant feedback** - Results update as you type

![Search input box with filtered results - placeholder]

### 4. One-Click Navigation

Click any line number (e.g., "12", "18") to:
- Jump to that location in your note
- Automatically select the exact highlighted term
- Scroll the editor to keep it in view

This makes the sidebar act like a true glossary or index, not just a list.

![Sidebar terms with clickable line numbers, editor showing selected text - placeholder]

### 5. Export to Markdown

Click **Export** to save the current index as a new markdown file alongside your note:

```markdown
# Index lexical - Project Planning

- Architecture: 8
- Critical Path: 12
- Deployment: 9, 18
- Design: 3, 14
- Development: 3
- etc...
```

Click **Open** to immediately view the exported file. Perfect for:
- Creating reference documents
- Sharing glossaries with teammates
- Archiving snapshots of your note structure

---

## 📖 How It Works

### The Flow

```
You open/edit a note
        ↓
Plugin scans markdown content
        ↓
Filters out code blocks & inline code
        ↓
Extracts formatted terms (**bold**, *italic*, ==highlight==)
        ↓
Groups repeated terms + deduplicates per line
        ↓
Sorts according to your preference (alphabetical or by line)
        ↓
Displays in interactive sidebar panel
        ↓
You click a term → editor jumps to exact location
```

### Smart Handling

- **Code protection**: Formatted text inside backticks or code blocks is ignored
- **Deduplication**: Only one line reference per term per line (cleaner display)
- **Line tracking**: Each occurrence preserves exact line number for navigation
- **Performance**: Real-time updates even on large notes

---

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/MathieuCGit/Index-Navgation_for_Obsidian.git
cd Index-Navgation_for_Obsidian

# Install dependencies
npm install

# Build plugin for development
npm run dev

# Build for production
npm run build

# Run test suite
npm test
```

### Project Structure

```
src/
├── main.ts                 # Plugin entry point & Obsidian lifecycle
├── application/
│   └── IndexController.ts  # Orchestrates logic, manages state (modes, sort preference)
├── domain/
│   └── markdownIndex.ts    # Core parsing and sorting logic
│       ├── buildBoldIndex()           # Parse markdown & extract terms
│       ├── filterBoldIndexEntries()   # Filter by search query
│       ├── sortBoldIndexEntries()     # Alphabetical or by-line sorting
│       └── buildMarkdownIndexDocument() # Generate export markdown
└── ui/
    └── IndexView.ts        # DOM rendering & event handling

tests/
├── domain/
│   ├── markdownIndex.test.ts      # Parser, filter, export tests
│   ├── buildBoldIndex.test.ts     # Index building tests
│   ├── filterBoldIndexEntries.test.ts
│   └── sortBoldIndex.test.ts      # Sort functionality (30+ tests)
└── vitest.config.ts        # Test configuration
```

### Architecture Principles

- **Separation of concerns**: Domain logic (parsing, sorting) independent from UI and Obsidian APIs
- **Testability**: Core functions are pure, with no side effects
- **Defensive programming**: Handles edge cases (empty files, no occurrences, malformed markdown)
- **Performance**: Real-time updates without rebuilding entire index on every keystroke
- **Extensibility**: Easy to add new sort modes, format types, or export formats

### Recent Additions (v1.2.0+)

- ✨ **Sort functionality** - Toggle between alphabetical and document-order sorting
- 🔄 **Persistent sort preference** - Remember user's choice across sessions
- 📊 **Comprehensive sorting tests** - 30+ unit tests covering edge cases and large datasets
- 🎯 **Defensive sort handling** - Graceful fallback if unexpected sort mode is used

### Testing

The project includes a comprehensive test suite using **Vitest**:

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch
```

**Current coverage:**
- Parser logic (buildBoldIndex)
- Filter functionality (search + mode selection)
- Sort functionality (alphabetical + by-line + edge cases)
- Export generation
- Edge cases (empty files, duplicates, code blocks)

### Adding New Features

When extending the plugin:

1. **Domain logic first** - Write parsing/logic functions in `domain/markdownIndex.ts`
2. **Add tests** - Create corresponding test files in `tests/domain/`
3. **UI layer last** - Update `ui/IndexView.ts` for rendering
4. **Update controller** - Wire up callbacks in `application/IndexController.ts`

---

## 🤝 Contributing

Contributions welcome! Whether you're:
- 🐛 Reporting bugs
- ✨ Suggesting features
- 🔧 Fixing issues
- 📚 Improving documentation

**Steps:**

1. [Fork the repository](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian/fork)
2. Create a branch: `git checkout -b feature/your-idea`
3. Make changes and add tests
4. Run `npm test` and `npm run build` to verify
5. Submit a pull request

---

## 📝 License

This plugin is released under the **GPL-3.0 License**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with dedication for the Obsidian community.

**Author:** [Mathieu CONAN](https://github.com/MathieuCGit)

Enjoying Navigation Index? ⭐ [Star the repository](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian) to show your support!

---

## Quick Links

- 📖 [Issues & Discussions](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian/issues)
- 💾 [Source Code](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian)
- 🐛 [Bug Reports](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian/issues)
- 📮 [Feature Requests](https://github.com/MathieuCGit/Index-Navgation_for_Obsidian/discussions)
