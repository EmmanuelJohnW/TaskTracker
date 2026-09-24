import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Renders user markdown. react-markdown escapes raw HTML, so this is XSS-safe. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-pre:my-2 [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item_input]:mr-1.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
