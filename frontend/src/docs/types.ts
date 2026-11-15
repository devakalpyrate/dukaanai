export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocPageItem {
  id: string;
  title: string;
  subtitle: string;
  categoryNumber: string;
  categoryTitle: string;
  headings: DocHeading[];
  content: React.ReactNode;
}

export interface DocCategory {
  id: string;
  number: string;
  title: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
  }[];
}
