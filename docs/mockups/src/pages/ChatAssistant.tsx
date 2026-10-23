import { useEffect, useRef, useState } from "react";
import {
  IconChat,
  IconSend,
  IconSparkles,
  IconUser,
  IconArrowRight,
} from "../components/icons";
import Button from "../components/Button";
import Card from "../components/Card";
import { chatSuggestions } from "../data/mock";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
}

const mockReply = (q: string): Msg => {
  const lower = q.toLowerCase();
  if (lower.includes("dầu") || lower.includes("dau")) {
    return {
      role: "assistant",
      content:
        "Để chọn dầu nhớt phù hợp, bạn cần dựa vào 3 yếu tố chính:\n\n1. **Loại động cơ** (xăng/diesel) và dung tích\n2. **Khuyến cáo của nhà sản xuất** (xem sách hướng dẫn)\n3. **Điều kiện vận hành**: thành phố nhiều → chọn độ nhớt thấp hơn\n\nVí dụ cho xe sedan 1.5L thành phố: thường dùng 5W-30 hoặc 5W-40. Nên thay sau mỗi 5.000 - 10.000 km.",
      sources: [
        {
          title: "Cách chọn dầu nhớt phù hợp cho xe ô tô của bạn",
          url: "/content/cach-chon-dau-nhot",
        },
      ],
    };
  }
  if (lower.includes("bảo dưỡng") || lower.includes("bao duong")) {
    return {
      role: "assistant",
      content:
        "Tần suất bảo dưỡng định kỳ được khuyến cáo:\n\n- **5.000 - 10.000 km** hoặc **6 tháng** (tuỳ điều kiện nào đến trước)\n- Bảo dưỡng nặng mỗi **40.000 - 60.000 km**\n\nCác hạng mục thường bao gồm: thay dầu, lọc dầu, lọc gió, kiểm tra phanh, lốp, ắc quy.",
      sources: [
        {
          title: "Bao lâu nên bảo dưỡng định kỳ một lần?",
          url: "/content/bao-lau-bao-duong",
        },
      ],
    };
  }
  if (lower.includes("phanh")) {
    return {
      role: "assistant",
      content:
        "5 dấu hiệu cần thay má phanh:\n\n1. **Tiếng kêu két** khi phanh\n2. **Bàn đạp rung** hoặc giật\n4. **Quãng đường phanh dài hơn** bình thường\n5. **Đèn cảnh báo phanh** sáng trên bảng điều khiển\n6. Má phanh mỏng hơn **3mm** (kiểm tra qua lỗ trên lazang)\n\nNên thay má phanh mỗi 40.000-60.000 km hoặc khi xuất hiện dấu hiệu.",
      sources: [
        {
          title: "5 dấu hiệu cảnh báo cần thay má phanh",
          url: "/content/dau-hieu-can-thay-phanh",
        },
      ],
    };
  }
  return {
    role: "assistant",
    content:
      "Cảm ơn bạn đã hỏi! Đây là câu trả lời mẫu từ trợ lý AI. Trong triển khai thật, tôi sẽ truy vấn knowledge graph về xe, garage, dịch vụ và phụ tùng để đưa ra câu trả lời chính xác nhất.",
  };
};

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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, mockReply(content)]);
      setTyping(false);
    }, 900);
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