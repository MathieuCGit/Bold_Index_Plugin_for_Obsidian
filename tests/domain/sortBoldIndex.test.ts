import { describe, it, expect } from 'vitest';
import { BoldIndexEntry, sortBoldIndexEntries, SortMode } from '../../src/domain/markdownIndex';

// Test suite for the sortBoldIndexEntries function.
// This function is critical for controlling how entries are presented to the user in the sidebar.
// We test both sort modes ('alphabetical' and 'byLine') to ensure they work correctly independently
// and handle edge cases like empty arrays, single entries, and duplicate line numbers.
describe('sortBoldIndexEntries', () => {
  // Sample test data: a collection of index entries with various terms and occurrences.
  // These entries simulate what the parser would produce from a real markdown document.
  const sampleEntries: BoldIndexEntry[] = [
    {
      term: 'Zebra',
      occurrences: [
        { term: 'Zebra', offset: 100, line: 10 },
        { term: 'Zebra', offset: 200, line: 20 }
      ]
    },
    {
      term: 'Apple',
      occurrences: [
        { term: 'Apple', offset: 50, line: 5 },
        { term: 'Apple', offset: 150, line: 15 }
      ]
    },
    {
      term: 'Banana',
      occurrences: [{ term: 'Banana', offset: 75, line: 8 }]
    },
    {
      term: 'Cherry',
      occurrences: [
        { term: 'Cherry', offset: 125, line: 12 },
        { term: 'Cherry', offset: 175, line: 18 }
      ]
    }
  ];

  describe('Alphabetical Sort Mode', () => {
    it('should sort entries alphabetically using French locale', () => {
      // When sorting alphabetically, entries should be ordered A-Z using natural language rules.
      const result = sortBoldIndexEntries(sampleEntries, 'alphabetical');

      expect(result[0].term).toBe('Apple');
      expect(result[1].term).toBe('Banana');
      expect(result[2].term).toBe('Cherry');
      expect(result[3].term).toBe('Zebra');
    });

    it('should handle case-insensitive alphabetical sorting', () => {
      // The sorting algorithm should handle mixed case consistently (French locale).
      const mixedCaseEntries: BoldIndexEntry[] = [
        { term: 'zebra', occurrences: [{ term: 'zebra', offset: 0, line: 1 }] },
        { term: 'APPLE', occurrences: [{ term: 'APPLE', offset: 0, line: 2 }] },
        { term: 'bAnAnA', occurrences: [{ term: 'bAnAnA', offset: 0, line: 3 }] }
      ];

      const result = sortBoldIndexEntries(mixedCaseEntries, 'alphabetical');

      // All should be present, in case-insensitive alphabetical order.
      expect(result.length).toBe(3);
      expect(result[0].term).toBe('APPLE');
      expect(result[1].term).toBe('bAnAnA');
      expect(result[2].term).toBe('zebra');
    });

    it('should handle special characters in alphabetical sorting', () => {
      // Terms with accents, hyphens, and other special characters should sort correctly
      // according to French locale rules.
      const specialCharEntries: BoldIndexEntry[] = [
        { term: 'école', occurrences: [{ term: 'école', offset: 0, line: 1 }] },
        { term: 'été', occurrences: [{ term: 'été', offset: 0, line: 2 }] },
        { term: 'éclair', occurrences: [{ term: 'éclair', offset: 0, line: 3 }] }
      ];

      const result = sortBoldIndexEntries(specialCharEntries, 'alphabetical');

      // Should maintain French locale ordering.
      expect(result.length).toBe(3);
      // All entries should still be present after sorting.
      expect(result.map(e => e.term)).toEqual(expect.arrayContaining(['école', 'été', 'éclair']));
    });

    it('should preserve occurrence data during alphabetical sort', () => {
      // Sorting entries should not modify or lose the occurrence information.
      const result = sortBoldIndexEntries(sampleEntries, 'alphabetical');

      // Check that Apple's occurrences are intact and in correct order.
      const appleEntry = result.find(e => e.term === 'Apple');
      expect(appleEntry).toBeDefined();
      expect(appleEntry!.occurrences.length).toBe(2);
      expect(appleEntry!.occurrences[0].line).toBe(5);
      expect(appleEntry!.occurrences[1].line).toBe(15);
    });

    it('should not mutate the original array', () => {
      // The sort function should return a new array, not modify the input.
      const originalLength = sampleEntries.length;
      const originalOrder = [...sampleEntries.map(e => e.term)];

      sortBoldIndexEntries(sampleEntries, 'alphabetical');

      // Original array should remain unchanged.
      expect(sampleEntries.length).toBe(originalLength);
      expect(sampleEntries.map(e => e.term)).toEqual(originalOrder);
    });
  });

  describe('By Line Sort Mode', () => {
    it('should sort entries by their first occurrence line number', () => {
      // When sorting by line, entries should appear in document reading order
      // (top to bottom), based on where the term first appears.
      const result = sortBoldIndexEntries(sampleEntries, 'byLine');

      // Verify ordering by first occurrence line number:
      // Apple at line 5, Banana at line 8, Zebra at line 10, Cherry at line 12
      expect(result[0].term).toBe('Apple'); // First occurrence at line 5
      expect(result[1].term).toBe('Banana'); // First occurrence at line 8
      expect(result[2].term).toBe('Zebra'); // First occurrence at line 10
      expect(result[3].term).toBe('Cherry'); // First occurrence at line 12
    });

    it('should sort by first occurrence line when entry has multiple occurrences', () => {
      // Entries can appear multiple times in a document. We sort by the first occurrence only.
      const multiOccurrenceEntries: BoldIndexEntry[] = [
        {
          term: 'Important',
          occurrences: [
            { term: 'Important', offset: 500, line: 50 },
            { term: 'Important', offset: 600, line: 60 },
            { term: 'Important', offset: 700, line: 70 }
          ]
        },
        {
          term: 'First',
          occurrences: [{ term: 'First', offset: 100, line: 10 }]
        }
      ];

      const result = sortBoldIndexEntries(multiOccurrenceEntries, 'byLine');

      // 'First' appears at line 10, 'Important' at line 50, so First should come first.
      expect(result[0].term).toBe('First');
      expect(result[1].term).toBe('Important');
    });

    it('should handle entries with same first line number consistently', () => {
      // If multiple entries have the same first line, sorting should be stable and deterministic.
      const sameLineEntries: BoldIndexEntry[] = [
        { term: 'Beta', occurrences: [{ term: 'Beta', offset: 100, line: 5 }] },
        { term: 'Alpha', occurrences: [{ term: 'Alpha', offset: 50, line: 5 }] },
        { term: 'Gamma', occurrences: [{ term: 'Gamma', offset: 150, line: 5 }] }
      ];

      const result = sortBoldIndexEntries(sameLineEntries, 'byLine');

      // All are on the same line, so they should maintain relative order (not moved).
      expect(result.length).toBe(3);
      // When line numbers are equal, JavaScript's sort is stable, so order is preserved from input.
      expect(result.map(e => e.term)).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    it('should preserve occurrence data during by-line sort', () => {
      // Sorting by line should not lose or corrupt occurrence information.
      const result = sortBoldIndexEntries(sampleEntries, 'byLine');

      // Verify that Zebra's occurrences are still intact.
      const zebraEntry = result.find(e => e.term === 'Zebra');
      expect(zebraEntry).toBeDefined();
      expect(zebraEntry!.occurrences.length).toBe(2);
      expect(zebraEntry!.occurrences[0].line).toBe(10);
      expect(zebraEntry!.occurrences[1].line).toBe(20);
    });

    it('should handle entries without occurrences gracefully', () => {
      // Defensive programming: an entry with an empty occurrences array should not crash.
      const emptyOccurrenceEntries: BoldIndexEntry[] = [
        { term: 'Normal', occurrences: [{ term: 'Normal', offset: 50, line: 5 }] },
        { term: 'Empty', occurrences: [] },
        { term: 'Another', occurrences: [{ term: 'Another', offset: 100, line: 10 }] }
      ];

      const result = sortBoldIndexEntries(emptyOccurrenceEntries, 'byLine');

      // The function should handle empty occurrence arrays without crashing.
      expect(result.length).toBe(3);
      // Entry with no occurrences should be treated as line 0 (appears first).
      expect(result[0].term).toBe('Empty');
    });

    it('should not mutate the original array', () => {
      // The sort function should return a new array, not modify the input.
      const originalLength = sampleEntries.length;
      const originalOrder = [...sampleEntries.map(e => e.term)];

      sortBoldIndexEntries(sampleEntries, 'byLine');

      // Original array should remain unchanged.
      expect(sampleEntries.length).toBe(originalLength);
      expect(sampleEntries.map(e => e.term)).toEqual(originalOrder);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array gracefully', () => {
      // An empty index should not cause errors and should return an empty array.
      const emptyEntries: BoldIndexEntry[] = [];

      const alphabeticalResult = sortBoldIndexEntries(emptyEntries, 'alphabetical');
      const byLineResult = sortBoldIndexEntries(emptyEntries, 'byLine');

      expect(alphabeticalResult).toEqual([]);
      expect(byLineResult).toEqual([]);
    });

    it('should handle single entry array', () => {
      // A single entry should be returned as-is, regardless of sort mode.
      const singleEntry: BoldIndexEntry[] = [
        { term: 'OnlyOne', occurrences: [{ term: 'OnlyOne', offset: 50, line: 5 }] }
      ];

      const alphabeticalResult = sortBoldIndexEntries(singleEntry, 'alphabetical');
      const byLineResult = sortBoldIndexEntries(singleEntry, 'byLine');

      expect(alphabeticalResult.length).toBe(1);
      expect(alphabeticalResult[0].term).toBe('OnlyOne');
      expect(byLineResult.length).toBe(1);
      expect(byLineResult[0].term).toBe('OnlyOne');
    });

    it('should handle unknown sort mode with fallback to alphabetical', () => {
      // If an unexpected sort mode is passed, the function should fall back to alphabetical sorting.
      // This is defensive programming to handle invalid input gracefully.
      const result = sortBoldIndexEntries(sampleEntries, 'invalidMode' as any);

      // Should fall back to alphabetical sorting.
      expect(result[0].term).toBe('Apple');
      expect(result[1].term).toBe('Banana');
    });

    it('should maintain data integrity for large datasets', () => {
      // Test with a larger set of entries to ensure performance and correctness at scale.
      const largeDataset: BoldIndexEntry[] = Array.from({ length: 100 }, (_, i) => ({
        term: `Term${String(100 - i).padStart(3, '0')}`, // Term100, Term099, ..., Term001
        occurrences: [{ term: `Term${i}`, offset: i * 10, line: i + 1 }]
      }));

      const alphabeticalResult = sortBoldIndexEntries(largeDataset, 'alphabetical');
      const byLineResult = sortBoldIndexEntries(largeDataset, 'byLine');

      // Both should return all 100 entries.
      expect(alphabeticalResult.length).toBe(100);
      expect(byLineResult.length).toBe(100);

      // Verify no entries were lost or duplicated.
      const alphabeticalTerms = new Set(alphabeticalResult.map(e => e.term));
      const byLineTerms = new Set(byLineResult.map(e => e.term));
      expect(alphabeticalTerms.size).toBe(100);
      expect(byLineTerms.size).toBe(100);
    });
  });

  describe('Consistency Across Sort Modes', () => {
    it('should return valid entries regardless of sort mode', () => {
      // The structure and content of entries should be valid after sorting, regardless of mode.
      const alphabeticalResult = sortBoldIndexEntries(sampleEntries, 'alphabetical');
      const byLineResult = sortBoldIndexEntries(sampleEntries, 'byLine');

      // Both results should have the same number of entries as input.
      expect(alphabeticalResult.length).toBe(sampleEntries.length);
      expect(byLineResult.length).toBe(sampleEntries.length);

      // All entries should be present (same set of terms).
      const inputTerms = new Set(sampleEntries.map(e => e.term));
      const alphabeticalTerms = new Set(alphabeticalResult.map(e => e.term));
      const byLineTerms = new Set(byLineResult.map(e => e.term));

      expect(alphabeticalTerms).toEqual(inputTerms);
      expect(byLineTerms).toEqual(inputTerms);
    });

    it('should preserve complete occurrence data in both sort modes', () => {
      // Regardless of sort mode, all occurrence information should be preserved exactly.
      const alphabeticalResult = sortBoldIndexEntries(sampleEntries, 'alphabetical');
      const byLineResult = sortBoldIndexEntries(sampleEntries, 'byLine');

      // Sum of all occurrences should match in both results.
      const inputOccurrenceCount = sampleEntries.reduce((sum, e) => sum + e.occurrences.length, 0);
      const alphabeticalOccurrenceCount = alphabeticalResult.reduce((sum, e) => sum + e.occurrences.length, 0);
      const byLineOccurrenceCount = byLineResult.reduce((sum, e) => sum + e.occurrences.length, 0);

      expect(alphabeticalOccurrenceCount).toBe(inputOccurrenceCount);
      expect(byLineOccurrenceCount).toBe(inputOccurrenceCount);
    });
  });
});
