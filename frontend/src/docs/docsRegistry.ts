import { DocCategory, DocPageItem } from './types';
import { DOC_CATEGORIES } from './docsData';
import { SECTION_01_PAGES } from './pages/Section01GettingStarted';
import { SECTION_02_PAGES } from './pages/Section02ProductGuide';
import { SECTION_03_PAGES } from './pages/Section03SystemArchitecture';
import { SECTION_04_PAGES } from './pages/Section04Database';
import { SECTION_05_PAGES } from './pages/Section05AIVoiceEngine';
import { SECTION_06_PAGES } from './pages/Section06ApiReference';
import { SECTION_07_PAGES } from './pages/Section07Security';
import { SECTION_08_PAGES } from './pages/Section08Integrations';
import { SECTION_09_PAGES } from './pages/Section09Development';
import { SECTION_10_PAGES } from './pages/Section10ReleaseRoadmap';

export const ALL_DOC_PAGES: Record<string, DocPageItem> = {
  ...SECTION_01_PAGES,
  ...SECTION_02_PAGES,
  ...SECTION_03_PAGES,
  ...SECTION_04_PAGES,
  ...SECTION_05_PAGES,
  ...SECTION_06_PAGES,
  ...SECTION_07_PAGES,
  ...SECTION_08_PAGES,
  ...SECTION_09_PAGES,
  ...SECTION_10_PAGES,
};

// Flattened list of all pages in exact sequential order for Prev/Next navigation
export const ORDERED_PAGE_IDS: string[] = DOC_CATEGORIES.flatMap((category) =>
  category.items.map((item) => item.id)
);

export function getDocPage(pageId: string): DocPageItem {
  return ALL_DOC_PAGES[pageId] || ALL_DOC_PAGES['intro'];
}

export function getAdjacentPages(pageId: string) {
  const currentIndex = ORDERED_PAGE_IDS.indexOf(pageId);
  if (currentIndex === -1) {
    return { prev: undefined, next: undefined };
  }

  const prevId = currentIndex > 0 ? ORDERED_PAGE_IDS[currentIndex - 1] : undefined;
  const nextId = currentIndex < ORDERED_PAGE_IDS.length - 1 ? ORDERED_PAGE_IDS[currentIndex + 1] : undefined;

  return {
    prev: prevId ? ALL_DOC_PAGES[prevId] : undefined,
    next: nextId ? ALL_DOC_PAGES[nextId] : undefined,
  };
}
