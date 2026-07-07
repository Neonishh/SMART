import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card } from "../components/ui";
import { sendChatMessage } from "../services/api";
import { chatSuggestions } from "../mock/data";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm Ask SMART. Ask me about publications, patents, grants, or research trends — I'll pull answers from the knowledge graph.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    const value = text ?? input;
    if (!value.trim()) return;
    setMessages((m) => [...m, { role: "user", content: value }]);
    setInput("");
    setLoading(true);
    const res = await sendChatMessage(value);
    setMessages((m) => [...m, { role: "assistant", content: res.data.reply }]);
    setLoading(false);
  }

  return (
    <DashboardLayout title="Ask SMART" description="Conversational search over the research knowledge graph">
      <Card className="flex flex-col h-[calc(100vh-11rem)] p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-lg rounded-sm px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--color-navy)] text-white ml-auto"
                  : "bg-[var(--color-paper-dim)] text-[var(--color-ink)]"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="max-w-lg rounded-sm px-4 py-2.5 text-sm bg-[var(--color-paper-dim)] text-[var(--color-muted)] font-mono">
              Thinking…
            </div>
          )}
        </div>

        {messages.length === 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {chatSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-sm border border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-ochre)] hover:text-[var(--color-ochre)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-3 border-t border-[var(--color-line)] px-4 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about publications, patents, grants…"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
          />
          <button
            type="submit"
            className="w-9 h-9 rounded-sm bg-[var(--color-navy)] text-white flex items-center justify-center shrink-0"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
