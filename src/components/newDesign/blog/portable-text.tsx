import {
  PortableText as BasePortableText,
  type PortableTextComponents,
} from '@portabletext/react';
import { urlFor, type SanityImage } from '@/services/sanity';

// A @sanity/table block. Node shape:
// { _type: 'table', rows: [{ _key, cells: [string, ...] }, ...] }
// The first row is treated as the header.
interface SanityTable {
  rows?: Array<{ _key?: string; cells?: string[] }>;
}

// React renderer for the Sanity Portable Text `body`. Mirrors the Astro blog's
// PortableTextImage.astro / PortableTextLink.astro / PortableTextTable.astro
// custom renderers.
const components: PortableTextComponents = {
  types: {
    // Images embedded in the article body.
    image: ({ value }: { value: SanityImage }) => {
      const src = value?.asset?._ref
        ? urlFor(value).width(1600).fit('max').auto('format').url()
        : undefined;
      if (!src) return null;
      return (
        <img
          src={src}
          alt={value.alt ?? ''}
          className="my-6 h-auto max-w-full rounded-lg"
          loading="lazy"
        />
      );
    },
    // Tables from the @sanity/table plugin. First row is the header; the
    // surrounding `prose` container styles the table via Tailwind Typography.
    table: ({ value }: { value: SanityTable }) => {
      const rows = value?.rows ?? [];
      if (rows.length === 0) return null;
      const [headRow, ...bodyRows] = rows;
      return (
        <div className="my-6 overflow-x-auto">
          <table>
            {headRow && (
              <thead>
                <tr>
                  {(headRow.cells ?? []).map((cell, i) => (
                    <th key={i}>{cell}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, r) => (
                <tr key={row._key ?? r}>
                  {(row.cells ?? []).map((cell, c) => (
                    <td key={c}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
  },
  marks: {
    // Link annotations — honor the "Open in new tab" toggle with a safe rel.
    link: ({ value, children }) => {
      const href = (value?.href as string) ?? '#';
      const newTab = Boolean(value?.openInNewTab);
      return (
        <a
          href={href}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
          className="text-[#2E5BFF] underline underline-offset-2 hover:text-[#1E48E6]"
        >
          {children}
        </a>
      );
    },
  },
};

export function PortableText({ value }: { value: unknown[] }) {
  return <BasePortableText value={value as never} components={components} />;
}
