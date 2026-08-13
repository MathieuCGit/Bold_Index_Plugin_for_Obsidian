// Represents a single detected occurrence of a bold term inside the note.
export type BoldOccurrence = {
  term: string;
  offset: number;
  line: number;
};

// Represents one bold term and all of its recorded positions in the note.
export type BoldIndexEntry = {
  term: string;
  occurrences: BoldOccurrence[];
};

// Filters the index entries according to the user query typed in the sidebar.
// We compare in lowercase to keep the search natural and insensitive to case.
export function filterBoldIndexEntries(entries: BoldIndexEntry[], query: string): BoldIndexEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => entry.term.toLowerCase().includes(normalizedQuery));
}

// Detects markdown bold content: **term**.
// The regex avoids matching escaped or malformed patterns such as ***.
const BOLD_REGEX = /\*\*(?!\*)(.*?)\*\*(?!\*)/g;

// Code blocks and inline code should not contribute to the bold index because they are code examples, not note content.
const CODE_BLOCK_PATTERNS = [
  /```[\s\S]*?```/g,
  /~~~[\s\S]*?~~~/g,
  /`[^`]*`/g
];

// Builds a sorted index of all bold terms present in a markdown content.
// Each match is attached to its offset in the document and its line number for later navigation.
export function buildBoldIndex(content: string): BoldIndexEntry[] {
  // Collect ranges to ignore when scanning the document.
  // This prevents code snippets from creating false positives in the sidebar.
  const ignoreRanges: [number, number][] = [];

  for (const pattern of CODE_BLOCK_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      if (typeof match.index === 'number') {
        ignoreRanges.push([match.index, match.index + match[0].length]);
      }
    }
  }

  // Returns true when a text position falls inside a code block or inline code region.
  const isIgnored = (pos: number) => ignoreRanges.some(([start, end]) => pos >= start && pos < end);
  const grouped = new Map<string, BoldOccurrence[]>();

  for (const match of content.matchAll(BOLD_REGEX)) {
    if (typeof match.index !== 'number') continue;

    const offset = match.index;
    if (isIgnored(offset)) continue;

    // Remove accidental whitespace around the bold term.
    const term = match[1].trim();
    if (!term) continue;

    // Compute the line number from the document prefix before the match.
    const line = content.slice(0, offset).split('\n').length;
    const list = grouped.get(term) ?? [];
    list.push({ term, offset, line });
    grouped.set(term, list);
  }

  return [...grouped.entries()]
    // Sort by term alphabetically in French locale to keep the UI stable and readable.
    .sort(([left], [right]) => left.localeCompare(right, 'fr'))
    .map(([term, occurrences]) => ({
      term,
      occurrences: occurrences
        // Keep navigation order consistent from top to bottom of the note.
        .sort((a, b) => a.line - b.line || a.offset - b.offset)
        // Avoid duplicates on the same line to keep each bold term readable in the list.
        .filter((occurrence, index, source) => {
          const previous = source[index - 1];
          return !previous || previous.line !== occurrence.line;
        })
    }));
}
