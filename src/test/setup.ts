import '@testing-library/jest-dom/vitest';

// Mock window.URL.createObjectURL for MapLibre GL tests
global.URL.createObjectURL = () => 'mock-object-url';
