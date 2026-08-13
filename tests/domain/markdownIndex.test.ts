import { describe, expect, it } from 'vitest';
import { buildBoldIndex, filterBoldIndexEntries } from '../../src/domain/markdownIndex';

describe('buildBoldIndex', () => {
  it('extracts bold terms and keeps them sorted alphabetically', () => {
    const content = '# Notes\n**Alpha** is here.\n**Beta** and **Alpha** appear again.\n';

    expect(buildBoldIndex(content)).toEqual([
      {
        term: 'Alpha',
        occurrences: [
          { term: 'Alpha', offset: 8, line: 2 },
          { term: 'Alpha', offset: 40, line: 3 }
        ]
      },
      {
        term: 'Beta',
        occurrences: [{ term: 'Beta', offset: 27, line: 3 }]
      }
    ]);
  });

  it('ignores bold terms inside code blocks and inline code', () => {
    const content = '**Visible**\n```\n**Ignored**\n```\n~~~\n**IgnoredToo**\n~~~\n`**Inline**`\n**AnotherVisible**\n';

    expect(buildBoldIndex(content).map((entry) => entry.term)).toEqual(['AnotherVisible', 'Visible']);
  });

  it('returns an empty list when no bold text exists', () => {
    expect(buildBoldIndex('plain text without emphasis')).toEqual([]);
  });

  it('keeps only the first occurrence per line for each term', () => {
    const content = '**Same** repeated **Same** on line one.\nAnother **Same** on another line.\n';

    expect(buildBoldIndex(content)).toEqual([
      {
        term: 'Same',
        occurrences: [
          { term: 'Same', offset: 0, line: 1 },
          { term: 'Same', offset: 48, line: 2 }
        ]
      }
    ]);
  });

  it('filters entries by a text query ignoring case', () => {
    const entries = [
      { term: 'Alpha', occurrences: [{ term: 'Alpha', offset: 0, line: 1 }] },
      { term: 'Beta', occurrences: [{ term: 'Beta', offset: 10, line: 1 }] },
      { term: 'Gamma', occurrences: [{ term: 'Gamma', offset: 20, line: 1 }] }
    ];

    expect(filterBoldIndexEntries(entries, 'ta')).toEqual([
      { term: 'Beta', occurrences: [{ term: 'Beta', offset: 10, line: 1 }] }
    ]);
    expect(filterBoldIndexEntries(entries, 'GAM')).toEqual([
      { term: 'Gamma', occurrences: [{ term: 'Gamma', offset: 20, line: 1 }] }
    ]);
  });
});
