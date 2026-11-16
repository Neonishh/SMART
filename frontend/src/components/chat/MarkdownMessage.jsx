// Small, dependency-free Markdown renderer for chat answers.
// Supports: paragraphs, **bold**, *italic* / _italic_, `code`, links,
// headings, bullet + numbered lists (one level of nesting), --- rules,
// and citation markers like [3] or [1, 4] which become clickable chips.
// Builds React elements only — never uses dangerouslySetInnerHTML.

import { Fragment } from "react";

const INLINE_RE =
  /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[(?:\d+(?:\s*,\s*\d+)*)\]|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function renderInline(text, onCite, keyPrefix = "") {
  const out = [];
  let last = 0;
  let m;
  // fresh regex per call: renderInline recurses (bold/italic), and a shared
  // global regex would have its lastIndex reset by the inner call → infinite loop
  const re = new RegExp(INLINE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${m.index}`;

    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(<strong key={key} className="font-semibold">{renderInline(tok.slice(2, -2), onCite, key)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(<code key={key} className="font-mono text-[0.8em] px-1 py-0.5 rounded-sm bg-[var(--color-paper)] border border-[var(--color-line)]">{tok.slice(1, -1)}</code>);
    } else if (/^\[\d/.test(tok)) {
      const nums = tok.slice(1, -1).split(",").map((n) => Number(n.trim()));
      out.push(
        <span key={key} className="inline-flex gap-0.5 align-super">
          {nums.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onCite?.(n)}
              className="text-[10px] leading-none font-mono px-1 py-0.5 rounded-sm bg-[var(--color-ochre-soft)] text-[var(--color-ochre)] hover:bg-[var(--color-ochre)] hover:text-white transition-colors"
              title={`Source ${n}`}
            >
              {n}
            </button>
          ))}
        </span>
      );
    } else if (tok.startsWith("[")) {
      const label = tok.slice(1, tok.indexOf("]("));
      const href = tok.slice(tok.indexOf("](") + 2, -1);
      const external = /^https?:/.test(href);
      out.push(
        <a key={key} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className="underline decoration-[var(--color-ochre)] underline-offset-2 hover:text-[var(--color-ochre)]">
          {label}
        </a>
      );
    } else {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), onCite, key)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parseBlocks(md) {
  const lines = md
    .replace(/\r/g, "")
    // some models cite with full-width brackets: 【3】 / 【1, 4】 → [3] / [1, 4]
    .replace(/【\s*(\d+(?:\s*[,，]\s*\d+)*)\s*】/g, (_, nums) => `[${nums.replace(/\s*[,，]\s*/g, ", ")}]`)
    // pseudo-citations like "[knowledge graph facts]" are not source numbers
    .replace(/ ?[[【]knowledge[ -]graph[^\]】]*[\]】]/gi, "")
    .split("\n");
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const bullet = line.match(/^(\s*)[-*•]\s+(.*)$/);
    const numbered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    const heading = line.match(/^(#{1,4})\s+(.*)$/);

    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushPara();
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "h", level: heading[1].length, text: heading[2] });
      continue;
    }
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      const indent = (bullet ? bullet[1] : numbered[1]).length;
      const text = bullet ? bullet[2] : numbered[3];
      if (list && indent >= 2 && list.items.length) {
        const parent = list.items[list.items.length - 1];
        (parent.children ||= []).push(text);
        continue;
      }
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { type: "list", ordered, items: [] };
      }
      list.items.push({ text });
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

export default function MarkdownMessage({ content = "", onCite }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        if (b.type === "hr") return <hr key={key} className="border-[var(--color-line)] my-3" />;
        if (b.type === "h") {
          return (
            <p key={key} className={`font-serif font-semibold text-[var(--color-ink)] ${b.level <= 2 ? "text-base" : "text-sm"} mt-1`}>
              {renderInline(b.text, onCite, key)}
            </p>
          );
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={key} className={`${b.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1 marker:text-[var(--color-muted)]`}>
              {b.items.map((it, j) => (
                <li key={j}>
                  {renderInline(it.text, onCite, `${key}-${j}`)}
                  {it.children && (
                    <ul className="list-[circle] pl-5 mt-1 space-y-0.5">
                      {it.children.map((c, k) => (
                        <li key={k}>{renderInline(c, onCite, `${key}-${j}-${k}`)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </Tag>
          );
        }
        return <p key={key}>{renderInline(b.text, onCite, key).map((n, k) => <Fragment key={k}>{n}</Fragment>)}</p>;
      })}
    </div>
  );
}
