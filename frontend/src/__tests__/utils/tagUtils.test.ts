import { describe, it, expect } from 'vitest';
import { getTagColor, shouldUseWhiteText, getTagChipStyles } from '../../utils/tagUtils';

describe('Tag Utility Functions', () => {
  // Sample tag for testing
  const sampleTag = {
    id: '12345678-1234-5678-abcd-1234567890ab',
    name: 'テストタグ',
    family_id: 'family-id',
    color: null
  };

  // Tag with explicit color
  const coloredTag = {
    ...sampleTag,
    id: '87654321-8765-4321-dcba-0987654321fe',
    color: '#ff0000' // Red
  };

  describe('getTagColor', () => {
    it('returns undefined when tag is selected', () => {
      const result = getTagColor(sampleTag.id, sampleTag.color, true);
      expect(result).toBeUndefined();
    });

    it('returns the tag color when specified', () => {
      const result = getTagColor(coloredTag.id, coloredTag.color, false);
      expect(result).toBe('#ff0000');
    });

    it('generates a consistent color based on tag ID', () => {
      const result1 = getTagColor(sampleTag.id, null, false);
      const result2 = getTagColor(sampleTag.id, null, false);
      
      // Same ID should yield same color
      expect(result1).toBe(result2);
      
      // Generated color should be a valid color
      expect(result1).toBeTruthy();
    });

    it('generates different colors for different tag IDs', () => {
      const result1 = getTagColor(sampleTag.id, null, false);
      const result2 = getTagColor(coloredTag.id, null, false);
      
      // Different IDs should yield different colors
      expect(result1).not.toBe(result2);
    });
  });

  describe('shouldUseWhiteText', () => {
    it('returns false for null or undefined colors', () => {
      expect(shouldUseWhiteText(null)).toBe(false);
      expect(shouldUseWhiteText(undefined)).toBe(false);
    });

    it('returns true for colors with "dark" in their name', () => {
      expect(shouldUseWhiteText('dark-blue')).toBe(true);
      expect(shouldUseWhiteText('#000000')).toBe(true); // Black
    });

    it('returns false for light colors', () => {
      expect(shouldUseWhiteText('#ffffff')).toBe(false); // White
      expect(shouldUseWhiteText('#ffff00')).toBe(false); // Yellow
    });
  });

  describe('getTagChipStyles', () => {
    it('returns empty object for selected tags', () => {
      const styles = getTagChipStyles(sampleTag, true);
      expect(Object.keys(styles).length).toBe(0);
    });

    it('sets background and border color for non-selected tags', () => {
      const styles = getTagChipStyles(sampleTag, false);
      
      // Should have bgcolor and borderColor
      expect(styles).toHaveProperty('bgcolor');
      expect(styles).toHaveProperty('borderColor');
      expect(styles).toHaveProperty('&:hover');
    });

    it('sets text color based on tag background color', () => {
      const darkTagStyles = getTagChipStyles({
        ...sampleTag,
        color: '#000000' // Black
      }, false);
      
      const lightTagStyles = getTagChipStyles({
        ...sampleTag,
        color: '#ffffff' // White
      }, false);
      
      // Dark background should have white text
      expect(darkTagStyles.color).toBe('#fff');
      
      // Light background should have default/inherit text color
      expect(lightTagStyles.color).toBe('inherit');
    });
  });
});
