/**
 * Tag utility functions
 */

// Tag color palette - consistent with theme colors
export const tagColors = {
  primary: {
    light: '#7986cb',
    main: '#3f51b5',
    dark: '#303f9f',
  },
  secondary: {
    light: '#ff4081',
    main: '#f50057',
    dark: '#c51162',
  },
  success: {
    light: '#81c784',
    main: '#4caf50',
    dark: '#388e3c',
  },
  warning: {
    light: '#ffb74d',
    main: '#ff9800',
    dark: '#f57c00',
  },
  error: {
    light: '#e57373',
    main: '#f44336',
    dark: '#d32f2f',
  },
  grey: {
    light: '#e0e0e0',
    main: '#9e9e9e',
    dark: '#616161',
  },
};

// Determines tag color based on tag ID or color
export const getTagColor = (tag: { id: string; color?: string }, isSelected: boolean) => {
  if (isSelected) {
    return undefined; // When selected, use MUI's default color
  }

  // If tag has a color set, use it as base
  if (tag.color) {
    // If it's a valid hex color code, use it directly
    if (tag.color.startsWith('#') && (tag.color.length === 7 || tag.color.length === 4)) {
      return tag.color;
    }
  }

  // Generate consistent color based on tag ID
  const tagId = tag.id || 'default';
  const seed = tagId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Select from color palette
  const colorKeys = Object.keys(tagColors);
  const colorKey = colorKeys[seed % colorKeys.length] as keyof typeof tagColors;
  
  // Select brightness level (light, main, dark)
  const brightLevels = ['light', 'main', 'dark'] as const;
  const brightLevel = brightLevels[(seed >> 4) % brightLevels.length];
  
  return tagColors[colorKey][brightLevel];
};

// Returns style object for tag chips
export const getTagChipStyles = (tag: { id: string; color?: string }, isSelected: boolean) => {
  if (isSelected) {
    // Selected tags use MUI's default styles
    return {};
  }
  
  const tagColor = getTagColor(tag, isSelected);
  
  return {
    bgcolor: isSelected ? undefined : tagColor,
    borderColor: isSelected ? undefined : tagColor,
    color: isSelected 
      ? undefined 
      : tagColor && tagColor.toLowerCase().includes('dark') 
        ? '#fff' 
        : 'inherit',
    '&:hover': {
      bgcolor: isSelected 
        ? undefined 
        : tagColor ? `${tagColor}99` : undefined, // Add transparency
    },
  };
};

export default {
  getTagColor,
  getTagChipStyles,
  tagColors,
};
