export type BoldOccurrence = {
  term: string;
  offset: number;
  line: number;
};

export type BoldIndexEntry = {
  term: string;
  occurrences: BoldOccurrence[];
};

const BOLD_REGEX = /\*\*(?!\*)(.*?)\*\*(?!\*)/g;
const CODE_BLOCK_PATTERNS = [
  /```[\s\S]*?```/g,
  /~~~[\s\S]*?~~~/g,
  /`[^`]*`/g
];

export function buildBoldIndex(content: string): BoldIndexEntry[] {
  const ignoreRanges: [number, number][] = [];

  for (const pattern of CODE_BLOCK_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      if (typeof match.index === 'number') {
        ignoreRanges.push([match.index, match.index + match[0].length]);
      }
    }
  }

  const isIgnored = (pos: number) => ignoreRanges.some(([start, end]) => pos >= start && pos < end);
  const grouped = new Map<string, BoldOccurrence[]>();

  for (const match of content.matchAll(BOLD_REGEX)) {
    if (typeof match.index !== 'number') continue;

    const offset = match.index;
    if (isIgnored(offset)) continue;

    const term = match[1].trim();
    if (!term) continue;

    const line = content.slice(0, offset).split('\n').length;
    const list = grouped.get(term) ?? [];
    list.push({ term, offset, line });
    grouped.set(term, list);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'fr'))
    .map(([term, occurrences]) => ({
      term,
      occurrences: occurrences
        .sort((a, b) => a.line - b.line || a.offset - b.offset)
        .filter((occurrence, index, source) => {
          const previous = source[index - 1];
          return !previous || previous.line !== occurrence.line;
        })
    }));
}
