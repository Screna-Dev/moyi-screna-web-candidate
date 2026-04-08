import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="my-1 leading-relaxed whitespace-pre-line">{children}</p>,
          ul: ({ children }) => <ul className="my-1 pl-4 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 pl-4 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          h1: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
          h3: ({ children }) => <h4 className="text-xs font-semibold mt-2 mb-1">{children}</h4>,
          code: ({ children }) => <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-300 pl-3 my-2 italic text-slate-500">{children}</blockquote>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
