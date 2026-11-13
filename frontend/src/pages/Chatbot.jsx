import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Check, Copy, Network, RotateCcw, Square } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card } from "../components/ui";
import MarkdownMessage from "../components/chat/MarkdownMessage";
import SourceList from "../components/chat/SourceList";
import { getChatHealth, sendChatMessage, streamChatMessage } from "../services/api";

const WELCOME = {
  role: "assistant",
  content:
    "Hi, I'm **Ask SMART**. Ask me about publications, patents, grants, theses, researchers or research trends across IISc, IIIT-B, PES, RVCE, MSRIT, BMSCE, DSCE and CMRIT. I'll answer from the knowledge graph and cite my sources.",
  welcome: true,
};

const STARTERS = [
  "Most cited papers on graph neural networks from IISc",
  "Who has the most patents at PES University?",
  "Compare RVCE and BMSCE",
  "Which research areas are growing fastest?",
  "Top researchers in AI",
  "DST funded grants since 2021",
];

const STORAGE_KEY = "ask-smart-chat-v1";

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed.map((m) => ({ ...m, streaming: false }));
  } catch {
    /* storage unavailable — start fresh */
  }
  return [WELCOME];
}

/** history sent to the backend: no welcome, no failed turns, keep `context` for follow-ups */
function toHistory(messages) {
  return messages
    .filter((m) => !m.welcome && !m.error && m.content)
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content, ...(m.context ? { context: m.context } : {}) }));
}

function TypingDots({ label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-ochre)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="flex items-center gap-1 hover:text-[var(--color-ochre)]"
      title="Copy answer"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function AssistantMessage({ m, isLast, onSuggest, busy }) {
  const [highlight, setHighlight] = useState(null);
  const sourcesRef = useRef(null);

  const onCite = useCallback((n) => {
    setHighlight(n);
    requestAnimationFrame(() => sourcesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    setTimeout(() => setHighlight(null), 2500);
  }, []);

  const waiting = m.streaming && !m.content;
  const hasGraphLink = m.sources?.some((s) => ["publication", "researcher", "institution", "patent"].includes(s.type));

  return (
    <div className="max-w-2xl">
      <div
        className={`rounded-sm px-4 py-3 text-sm leading-relaxed ${
          m.error
            ? "bg-red-50 text-red-800 border border-red-200"
            : "bg-[var(--color-paper-dim)] text-[var(--color-ink)]"
        }`}
      >
        {waiting ? (
          <TypingDots label={m.stage || "Searching the knowledge graph…"} />
        ) : (
          <MarkdownMessage content={m.content} onCite={onCite} />
        )}
        {m.streaming && m.content && <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[var(--color-ochre)] animate-pulse" />}

        <SourceList ref={sourcesRef} sources={m.sources || []} highlight={highlight} />

        {!m.streaming && !m.welcome && !m.error && (
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[var(--color-line)] text-[11px] font-mono text-[var(--color-muted)]">
            <CopyButton text={m.content} />
            {hasGraphLink && (
              <Link to="/dashboard/knowledge-graph" className="flex items-center gap-1 hover:text-[var(--color-ochre)]">
                <Network size={12} /> Explore in graph
              </Link>
            )}
            {m.meta?.mode && (
              <span className="ml-auto" title={(m.meta.trace || []).join("\n")}>
                {m.meta.mode === "llm" ? `AI answer · ${m.meta.llm?.model || m.meta.llm?.provider}` : m.meta.mode === "template" ? "Direct from knowledge graph" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {isLast && !m.streaming && m.suggestions?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {m.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onSuggest(s)}
              className="text-xs px-3 py-1.5 rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:border-[var(--color-ochre)] hover:text-[var(--color-ochre)] transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Chatbot() {
  const [messages, setMessages] = useState(loadStored);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.streaming)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    getChatHealth()
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({ graph: "down" }));
  }, []);

  const updateLast = (patch) =>
    setMessages((ms) => {
      const copy = [...ms];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = typeof patch === "function" ? { ...last, ...patch(last) } : { ...last, ...patch };
      return copy;
    });

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || busy) return;

    const history = toHistory(messages);
    setMessages((ms) => [
      ...ms,
      { role: "user", content: value },
      { role: "assistant", content: "", streaming: true, stage: "Searching the knowledge graph and documents…" },
    ]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let gotDone = false;
      await streamChatMessage(
        value,
        history,
        {
          onMeta: (meta) =>
            updateLast({
              sources: meta.sources,
              suggestions: meta.suggestions,
              context: meta.context,
              meta: meta.meta,
              stage: meta.meta?.mode === "llm" ? "Writing the answer…" : "Formatting results…",
            }),
          onToken: (t) => updateLast((last) => ({ content: (last.content || "") + t })),
          onDone: (d) => {
            gotDone = true;
            updateLast((last) => ({
              content: d.reply || last.content,
              streaming: false,
              meta: d.meta ? { ...last.meta, ...d.meta } : last.meta,
            }));
          },
          onError: (e) => {
            gotDone = true;
            updateLast({ content: e.message || "Something went wrong.", streaming: false, error: true });
          },
        },
        controller.signal
      );

      if (controller.signal.aborted) {
        updateLast((last) => ({ content: last.content ? `${last.content}\n\n_(stopped)_` : "_Stopped._", streaming: false }));
      } else if (!gotDone) {
        updateLast({ streaming: false });
      }
    } catch (streamErr) {
      // Streaming not available (proxy, old backend…) → regular request
      try {
        const res = await sendChatMessage(value, history);
        updateLast({
          content: res.data.reply,
          sources: res.data.sources || [],
          suggestions: res.data.suggestions || [],
          context: res.data.context || null,
          meta: res.data.meta || null,
          streaming: false,
        });
      } catch (err) {
        console.error("Chat failed", streamErr, err);
        updateLast({
          content: "I couldn't reach the SMART backend. Make sure it's running (`npm start` in /backend) and try again.",
          streaming: false,
          error: true,
        });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    stop();
    setMessages([WELCOME]);
  }

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant");
  const semanticOn = health?.retriever?.status === "ok";
  const llmOn = health?.llm?.enabled;

  return (
    <DashboardLayout title="Ask SMART" description="Conversational search over the research knowledge graph">
      <Card className="flex flex-col h-[calc(100vh-11rem)] p-0">
        {/* header strip */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--color-line)] text-[11px] font-mono text-[var(--color-muted)]">
          {health && (
            <>
              <span className="flex items-center gap-1.5" title={String(health.graph)}>
                <span className={`w-1.5 h-1.5 rounded-full ${health.graph === "ok" ? "bg-emerald-500" : "bg-red-500"}`} /> Graph
              </span>
              <span className="flex items-center gap-1.5" title={health.retriever?.error || "Semantic search (FAISS)"}>
                <span className={`w-1.5 h-1.5 rounded-full ${semanticOn ? "bg-emerald-500" : "bg-amber-400"}`} /> Semantic
              </span>
              <span className="flex items-center gap-1.5" title={llmOn ? `${health.llm.provider} · ${health.llm.model}` : "No LLM configured — answers are formatted directly from the graph"}>
                <span className={`w-1.5 h-1.5 rounded-full ${llmOn ? "bg-emerald-500" : "bg-amber-400"}`} /> AI answers
              </span>
            </>
          )}
          <button
            type="button"
            onClick={reset}
            className="ml-auto flex items-center gap-1.5 hover:text-[var(--color-ochre)]"
            title="Start a new conversation"
          >
            <RotateCcw size={12} /> New chat
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="max-w-lg ml-auto rounded-sm px-4 py-2.5 text-sm leading-relaxed bg-[var(--color-navy)] text-white whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <AssistantMessage key={i} m={m} isLast={i === lastAssistantIdx} onSuggest={send} busy={busy} />
            )
          )}

          {messages.length === 1 && (
            <div className="grid sm:grid-cols-2 gap-2 max-w-2xl">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-[13px] px-3.5 py-2.5 rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ochre)] hover:text-[var(--color-ochre)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-3 border-t border-[var(--color-line)] px-4 py-3"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about publications, patents, grants, researchers, trends…"
            className="flex-1 resize-none max-h-32 bg-transparent outline-none text-sm leading-6 text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="w-9 h-9 rounded-sm bg-[var(--color-ochre)] text-white flex items-center justify-center shrink-0"
              aria-label="Stop generating"
              title="Stop"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-sm bg-[var(--color-navy)] text-white flex items-center justify-center shrink-0 disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </form>
      </Card>
    </DashboardLayout>
  );
}
