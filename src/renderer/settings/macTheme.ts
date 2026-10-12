import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';
const mint: BrandVariants = {
  10: '#031b19', 20: '#06332e', 30: '#08493e', 40: '#075e50', 50: '#087260', 60: '#0b876f', 70: '#119b80',
  80: '#087c68', 90: '#2bbda0', 100: '#46cdb0', 110: '#65dcc2', 120: '#87e6d1', 130: '#a6efdf', 140: '#c5f5ea',
  150: '#e0faf4', 160: '#f2fdfa',
};
const base: Partial<Theme> = {
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  borderRadiusSmall: '6px', borderRadiusMedium: '10px', borderRadiusLarge: '16px',
};
export const macLightTheme: Theme = { ...createLightTheme(mint), ...base };
export const macDarkTheme: Theme = { ...createDarkTheme(mint), ...base, colorBrandBackground: '#087c68', colorBrandForeground1: '#65dcc2' };
