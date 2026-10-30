import { useEffect, useRef, useState } from "react";
import {
  IconChat,
  IconSend,
  IconSparkles,
  IconUser,
  IconArrowRight,
  IconWarning,
} from "../../components/icons";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { chatSuggestions } from "../../data/mock";
import { agentApi } from "../../api/endpoints/ai";
import type { ChatRequest } from "../../api/endpoints/ai";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
}

/**
 * Module-level state lưu session_id qua nhiều lượt gửi.
 * Đặt ngoài component để giữ qua lần remount.
 *
 * Lưu ý: phía backend session state thực sự là *stateless theo message hiện tại* —
 * ReAct agent chỉ dùng messages của lượt đó. Việc giữ session_id chỉ để phục vụ
 * client-side cache nếu sau này tích hợp persistent memory.
 */
function randomUUID(): string {
  // `crypto.randomUUID` có trên trình duyệt hiện đại và Node 19+, nhưng
  // Vite có thể tích hợp trình duyệt cũ — fallback để an toàn.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 — đủ tốt cho mục đích định danh phiên client-side.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let sessionId: string = randomUUID();

// (mockReply đã bỏ — chuyển sang gọi agent API thật)
// SOURCES hiện để trống vì trợ lý backend chưa trích dẫn nguồn — nếu sau này
// agent trả về citation, parse từ response và đưa vào đây.
const SOURCES: Array<{ title: string; url: string }> = [];

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI của AutoCare. Tôi có thể giúp bạn tìm hiểu về bảo dưỡng, sửa chữa và phụ tùng ô tô. Bạn đang quan tâm đến vấn đề gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: Msg = { role: "user", content };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setError(null);
    setTyping(true);

    const payload: ChatRequest = {
      message: content,
      session_id: sessionId,
    };

    try {
      const res = await agentApi.send(payload);
      sessionId = res.session_id;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.response,
          sources: SOURCES,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Agent không phản hồi.";
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Xin lỗi, hiện tại tôi không thể trả lời câu hỏi này. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="container-page py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
            <IconChat size={22} />
          </div>
          <div>
            <h1 className="font-bold text-xl">Trợ lý AI</h1>
            <p className="text-xs text-ink-muted">
              Hỏi đáp về bảo dưỡng, sửa chữa, phụ tùng ô tô
            </p>
          </div>
        </div>

        {/* Chat container */}
        <Card>
          <div className="h-[500px] md:h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 1 && (
                <div className="mb-2">
                  <p className="text-xs text-ink-muted mb-2">
                    Gợi ý câu hỏi:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {chatSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="px-3 py-1.5 text-xs rounded-full bg-bgsoft hover:bg-accent text-ink transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}

              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <IconSparkles size={16} />
                  </div>
                  <div className="bg-bgsoft rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && (
              <div className="mx-5 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <IconWarning size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-ink/8 p-4 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 h-11 px-4 rounded-xl border border-ink/15 bg-white outline-none text-sm focus:border-primary"
              />
              <Button onClick={() => send()} disabled={!input.trim()}>
                <IconSend size={16} />
                <span className="hidden sm:inline">Gửi</span>
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-xs text-ink-muted text-center mt-4">
          Trợ lý có thể mắc sai sót. Vui lòng kiểm tra lại thông tin quan trọng.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={[
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-accent text-ink" : "bg-primary text-white",
        ].join(" ")}
      >
        {isUser ? <IconUser size={16} /> : <IconSparkles size={16} />}
      </div>
      <div
        className={[
          "max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-white rounded-tr-md"
            : "bg-bgsoft text-ink rounded-tl-md",
        ].join(" ")}
      >
        {msg.content}
        {msg.sources && msg.sources.length > 0 && (
          <div
            className={[
              "mt-3 pt-3 border-t",
              isUser ? "border-white/20" : "border-ink/10",
            ].join(" ")}
          >
            <div className="text-xs opacity-80 mb-1.5">Nguồn tham khảo:</div>
            {msg.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                className="flex items-center gap-1 text-xs hover:underline opacity-90"
              >
                <IconArrowRight size={12} /> {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}