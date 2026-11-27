/**
 * RichTextEditor — trình soạn thảo rich-text cho nội dung bài viết.
 *
 * Dùng TipTap (ProseMirror) nên trải nghiệm soạn văn bản giống Facebook:
 * không cần biết HTML, chỉ cần bôi đen rồi bấm nút định dạng.
 *
 * Các nút hỗ trợ:
 *  - Định dạng: in đậm, in nghiêng, gạch chân, gạch ngang, mã
 *  - Khối: tiêu đề H2/H3, đoạn văn, trích dẫn, code block
 *  - Danh sách: có số, không đánh số
 *  - Chèn ảnh: chọn từ máy → tải lên kho ảnh → nhúng vào nội dung
 *  - Chèn liên kết
 *  - Căn lề: trái, giữa, phải, đều
 *  - Bỏ định dạng (clear)
 *
 * Giá trị ra ngoài là HTML string — backend sanitize lại trước khi lưu
 * (xem `NewsHtmlSanitizer`), nên đây chỉ là lớp trình bày.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { newsApi } from "../api/endpoints/news";
import { useToast } from "./Toast";

interface Props {
  /** Nội dung HTML hiện tại. */
  value: string;
  /** Gọi khi nội dung thay đổi (HTML). */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Chiều cao tối thiểu của vùng soạn (px). */
  minHeight?: number;
}

/** Nút trên toolbar. */
function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "h-8 min-w-8 px-2 rounded-md text-sm font-medium transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-primary text-white"
          : "text-ink hover:bg-bgsoft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Viết nội dung bài viết của bạn...",
  minHeight = 320,
}: Props) {
  const t = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  /** Chỉ set HTML từ ngoài vào editor khi khác với nội dung hiện tại —
   *  tránh reset con trỏ mỗi lần gõ. */
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "news-editor-image" },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "news-editor-content focus:outline-none",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      lastExternalValue.current = currentEditor.getHTML();
      onChange(currentEditor.getHTML());
    },
  });

  // Đồng bộ nội dung khi mở bài viết để sửa (form được nạp lại).
  useEffect(() => {
    if (!editor) return;
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const handleImageFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !editor) return;

      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        t.error("Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        t.error("Kích thước ảnh tối đa 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const uploaded = await newsApi.uploadImage(file);
        editor
          .chain()
          .focus()
          .setImage({ src: uploaded.url, alt: file.name })
          .run();
        t.success("Đã chèn ảnh vào nội dung");
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không tải lên được ảnh",
        );
      } finally {
        setUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    },
    [editor, t],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Nhập đường dẫn liên kết:",
      previousUrl ?? "https://",
    );
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-ink/15 bg-white flex items-center justify-center text-sm text-ink-muted"
        style={{ minHeight }}
      >
        Đang khởi tạo trình soạn thảo...
      </div>
    );
  }

  const isHeading = (level: 2 | 3 | 4) =>
    editor.isActive("heading", { level });

  return (
    <div className="rounded-xl border border-ink/15 bg-white overflow-hidden focus-within:border-primary">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap p-2 border-b border-ink/8 bg-bgsoft/50">
        {/* Định dạng chữ */}
        <ToolbarButton
          title="In đậm (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="In nghiêng (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Gạch chân (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton
          title="Gạch ngang"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </ToolbarButton>

        <span className="w-px h-5 bg-ink/15 mx-1" />

        {/* Khối văn bản */}
        <ToolbarButton
          title="Đoạn văn"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          ¶
        </ToolbarButton>
        <ToolbarButton
          title="Tiêu đề cấp 2"
          active={isHeading(2)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Tiêu đề cấp 3"
          active={isHeading(3)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          title="Tiêu đề cấp 4"
          active={isHeading(4)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          H4
        </ToolbarButton>

        <span className="w-px h-5 bg-ink/15 mx-1" />

        {/* Danh sách & trích dẫn */}
        <ToolbarButton
          title="Danh sách có số"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          title="Danh sách không đánh số"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Trích dẫn"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="Khối mã"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"</>"}
        </ToolbarButton>

        <span className="w-px h-5 bg-ink/15 mx-1" />

        {/* Chèn ảnh & liên kết */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleImageFile(e.target.files?.[0])}
        />
        <ToolbarButton
          title="Chèn ảnh từ máy"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "⏳" : "🖼"}
        </ToolbarButton>
        <ToolbarButton
          title="Chèn liên kết"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          🔗
        </ToolbarButton>

        <span className="w-px h-5 bg-ink/15 mx-1" />

        {/* Căn lề */}
        <ToolbarButton
          title="Căn trái"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          ⇤
        </ToolbarButton>
        <ToolbarButton
          title="Căn giữa"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          ↔
        </ToolbarButton>
        <ToolbarButton
          title="Căn phải"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          ⇥
        </ToolbarButton>

        <span className="w-px h-5 bg-ink/15 mx-1" />

        <ToolbarButton
          title="Xoá định dạng"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          ⌫
        </ToolbarButton>
      </div>

      {/* Vùng soạn */}
      <EditorContent editor={editor} />

      {/* Gợi ý */}
      <div className="px-3 py-2 border-t border-ink/8 bg-bgsoft/40 text-xs text-ink-muted flex items-center justify-between gap-3">
        <span>
          Bôi đen văn bản rồi chọn định dạng, hoặc dùng nút ảnh để chèn ảnh
          từ máy. Nội dung hiển thị trực tiếp trên trang đọc bài.
        </span>
      </div>
    </div>
  );
}
