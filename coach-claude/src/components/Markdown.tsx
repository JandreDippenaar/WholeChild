import { Fragment, type ReactNode } from "react";

// Minimal, dependency-free markdown for chat output: headings, bullet lists,
// bold, and inline code. Good enough for coaching replies.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on **bold** and `code`.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={`${keyBase}-b-${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(<code key={`${keyBase}-c-${i}`}>{part.slice(1, -1)}</code>);
    } else {
      nodes.push(<Fragment key={`${keyBase}-t-${i}`}>{part}</Fragment>);
    }
  });
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length) {
      blocks.push(
        <ul key={key}>
          {listItems.map((li, i) => (
            <li key={i}>{renderInline(li, `${key}-${i}`)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };
  const flushPara = (key: string) => {
    if (paragraph.length) {
      const joined = paragraph.join(" ");
      blocks.push(<p key={key}>{renderInline(joined, key)}</p>);
      paragraph = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (heading) {
      flushPara(`p-${idx}`);
      flushList(`l-${idx}`);
      const level = heading[1].length;
      const Tag = (`h${Math.min(3, level + 1)}` as "h2" | "h3");
      blocks.push(<Tag key={`h-${idx}`}>{renderInline(heading[2], `h-${idx}`)}</Tag>);
    } else if (bullet || numbered) {
      flushPara(`p-${idx}`);
      listItems.push((bullet ? bullet[1] : numbered![1]));
    } else if (line.trim() === "") {
      flushPara(`p-${idx}`);
      flushList(`l-${idx}`);
    } else {
      flushList(`l-${idx}`);
      paragraph.push(line);
    }
  });
  flushPara("p-end");
  flushList("l-end");

  return <div className="md">{blocks}</div>;
}
