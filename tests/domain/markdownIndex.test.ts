import { describe, expect, it } from 'vitest';
import { buildBoldIndex, buildMarkdownIndexDocument, filterBoldIndexEntries } from '../../src/domain/markdownIndex';

// This suite covers the core parsing and filtering behavior of the bold index.
// It is intentionally kept close to the domain logic so future regressions are easy to diagnose.
describe('buildBoldIndex', () => {
  it('exports the index as a markdown document with heading and term entries', () => {
    const entries = [
      {
        term: 'Alpha',
        occurrences: [{ term: 'Alpha', offset: 0, line: 2 }, { term: 'Alpha', offset: 30, line: 4 }]
      },
      {
        term: 'Beta',
        occurrences: [{ term: 'Beta', offset: 18, line: 3 }]
      }
    ];

    expect(buildMarkdownIndexDocument('Ma note', entries)).toBe(
      '# Index lexical - Ma note\n\n- Alpha: 2, 4\n- Beta: 3\n'
    );
  });

  // The parser must extract all bold fragments, merge duplicates, and keep the final list alphabetized.
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

  // Markdown code fences and inline code snippets should never appear in the bold index.
  // Otherwise the UI would show false positives from the code itself instead of the note content.
  it('ignores bold terms inside code blocks and inline code', () => {
    const content = '**Visible**\n```\n**Ignored**\n```\n~~~\n**IgnoredToo**\n~~~\n`**Inline**`\n**AnotherVisible**\n';

    expect(buildBoldIndex(content).map((entry) => entry.term)).toEqual(['AnotherVisible', 'Visible']);
  });

  // Empty content or non-emphasized content should not generate index entries.
  it('returns an empty list when no bold text exists', () => {
    expect(buildBoldIndex('plain text without emphasis')).toEqual([]);
  });

  // A single term may appear multiple times on the same line, but we only keep one line reference per item.
  // This avoids noisy duplicates in the sidebar while still preserving later occurrences on other lines.
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

  // The search filter is case-insensitive, so users can type either uppercase or lowercase values.
  // This lets the sidebar behave naturally for note titles and search terms.
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
