import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders admin-editable Markdown safely: raw HTML is never rendered
 * (skipHtml, no rehype-raw) and links are limited to http(s), mailto,
 * relative paths and anchors.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={(url) => (/^(https?:|mailto:|\/|#)/i.test(url) ? url : "")}
      components={{
        a: ({ href, children: c }) =>
          href?.startsWith("http") ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {c}
            </a>
          ) : (
            <a href={href}>{c}</a>
          ),
        // Wide tables scroll horizontally; tabIndex lets keyboard users scroll them.
        table: ({ children: c }) => <table tabIndex={0}>{c}</table>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
