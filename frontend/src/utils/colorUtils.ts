// Color utility functions for consistent tag color handling throughout the app

// Basic theme color palette that matches Material UI theme
export const themeColors = {
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
  accent: {
    light: '#4dd0e1',
    main: '#00bcd4',
    dark: '#0097a7',
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

/**
 * Determines a consistent color for a tag based on its ID or specified color
 * @param tagId - The tag's ID to use for deterministic color generation
 * @param tagColor - The tag's color if already specified
 * @param isSelected - Whether the tag is currently selected
 * @returns The appropriate color value for the tag
 */
export const getTagColor = (tagId: string, tagColor?: string | null, isSelected = false): string | undefined => {
  // If selected and not providing a background color, return undefined to use the default selection color
  if (isSelected) {
    return undefined;
  }

  // If the tag has a specified color, use that
  if (tagColor) {
    return tagColor;
  }

  // Otherwise generate a deterministic color based on the tag ID
  // Use the first and last characters of the ID to get a consistent color
  const colorSeed = tagId.charCodeAt(0) + tagId.charCodeAt(tagId.length - 1);
  
  // Select a color category based on the ID
  const colorKeys = ['primary', 'secondary', 'accent', 'success', 'warning', 'error'];
  const selectedColorCategory = colorKeys[colorSeed % colorKeys.length];
  
  // Select a shade based on the ID
  const shadeKeys = ['light', 'main', 'dark'];
  const selectedShade = shadeKeys[(colorSeed >> 4) % shadeKeys.length];
  
  // Return the color from our theme palette
  return themeColors[selectedColorCategory as keyof typeof themeColors][selectedShade as keyof typeof themeColors[keyof typeof themeColors]];
};

/**
 * Determines if a color is dark (to use white text) or light (to use dark text)
 * @param color - The color to check, as a hex string
 * @returns true if the text should be white, false if the text should be dark
 */
export const shouldUseWhiteText = (color?: string | null): boolean => {
  if (!color) return false;
  
  // For named colors in our themeColors that have 'dark' in their key
  if (typeof color === 'string' && color.toLowerCase().includes('dark')) {
    return true;
  }
  
  // For hex colors, calculate luminance
  if (color.startsWith('#')) {
    // Convert hex to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text if brightness is low (dark color)
    return brightness < 0.6;
  }
  
  return false;
};
