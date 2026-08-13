import { describe, expect, it } from 'vitest';
import { filterBoldIndexEntries } from '../../src/domain/markdownIndex';

// This suite validates the search behavior applied on top of the generated index.
// The goal is to keep the filter user-friendly while preserving the original data structure.
describe('filterBoldIndexEntries', () => {
  // The user should be able to type part of a term and get matching entries regardless of case.
  // This simulates the live search used in the sidebar list.
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

  // When the input is empty or only whitespace, the filter should not hide anything.
  // This preserves the full list until the user starts typing a real query.
  it('returns all entries when the query is empty', () => {
    const entries = [
      { term: 'Alpha', occurrences: [{ term: 'Alpha', offset: 0, line: 1 }] },
      { term: 'Beta', occurrences: [{ term: 'Beta', offset: 10, line: 1 }] }
    ];

    expect(filterBoldIndexEntries(entries, '   ')).toEqual(entries);
  });
});
