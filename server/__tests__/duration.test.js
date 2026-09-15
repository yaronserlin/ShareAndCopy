/**
 * Preview: server/__tests__/duration.test.js
 * Description: Parsing of the token-lifetime durations used for cookie expiries.
 */

const { toSeconds } = require('../src/utils/duration');

describe('duration.toSeconds', () => {
    it.each([
        ['30s', 30],
        ['15m', 900],
        ['1h', 3600],
        ['7d', 604800],
        ['30d', 2592000],
        ['2w', 1209600]
    ])('parses %s', (input, expected) => {
        expect(toSeconds(input)).toBe(expected);
    });

    it('passes numbers through as seconds', () => {
        expect(toSeconds(120)).toBe(120);
    });

    it('falls back when the value cannot be parsed', () => {
        expect(toSeconds('whenever', 42)).toBe(42);
        expect(toSeconds(undefined, 42)).toBe(42);
    });
});
