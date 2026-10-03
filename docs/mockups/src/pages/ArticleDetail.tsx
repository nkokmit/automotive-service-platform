import { useEffect, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconUser,
  IconArrowRight,
  IconShare,
  IconCheck,
  IconShield,
  IconWrench,
  IconSparkles,
  IconNote,
} from "../components/icons";
import Button from "../components/Button";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { useToast } from "../components/Toast";
import { articles, type Article, type ArticleSection } from "../data/mock";
import { useState } from "react";

// =========================
// Parse DD/MM/YYYY -> Date
// =========================
function parseDate(dateStr: string): Date {
  const [d, mo, y] = dateStr.split("/").map(Number);
  return new Date(y, mo - 1, d);
}

// =========================
// Main component
// =========================
export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const t = useToast();

  const article = useMemo(
    () => articles.find((a) => a.slug === slug),
    [slug],
  );

  // Scroll to top khi slug đổi
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  if (!article) {
    return <Navigate to="/news" replace />;
  }

  // Related articles: cùng category, trừ chính nó, max 3
  const related = useMemo(
    () =>
      articles
        .filter((a) => a.id !== article.id && a.category === article.category)
        .slice(0, 3),
    [article],
  );

  // TOC từ sections có heading
  const toc = useMemo(
    () =>
      article.sections
        .filter(
          (s): s is Extract<ArticleSection, { type: "heading" }> =>
            s.type === "heading",
        )
        .filter((s) => s.level === 2)
        .map((s) => ({ id: s.id, text: s.text })),
    [article],
  );

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url,
        });
      } catch {
        // user cancel
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        t.success("Đã sao chép liên kết vào clipboard");
      } catch {
        t.error("Không thể sao chép liên kết");
      }
    }
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative bg-bgsoft overflow-hidden">
        <div className="container-page py-8 md:py-12">
          {/* Breadcrumb */}
          <nav className="text-xs text-ink-muted mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-primary">
              Trang chủ
            </Link>
            <span>/</span>
            <Link to="/news" className="hover:text-primary">
              Tin tức
            </Link>
            <span>/</span>
            <span className="text-ink line-clamp-1">{article.category}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
            {/* Content */}
            <div>
              <Badge tone="primary" className="mb-4">
                {article.category}
              </Badge>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5 text-ink">
                  {article.title}
                </h1>
                <p className="text-ink-light text-lg leading-relaxed mb-6">
                  {article.excerpt}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <img
                      src={article.author.avatar}
                      alt={article.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-ink">
                        {article.author.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {article.author.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted ml-auto">
                    <div className="flex items-center gap-1">
                      <IconCalendar size={14} />
                      <span>{article.publishedAt}</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <IconClock size={14} />
                      <span>{article.readMinutes} phút đọc</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <IconShare size={16} />
                    Chia sẻ
                  </Button>
                  <Link to="/news">
                    <Button variant="ghost" size="sm">
                      <IconArrowLeft size={16} />
                      Quay lại
                    </Button>
                  </Link>
                </div>
              </div>

            {/* Hero image */}
            <div className="hidden lg:block">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-cardHover bg-white">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-page py-10 md:py-14">
        <div className="grid lg:grid-cols-[1fr_280px] gap-10">
          {/* Article body */}
          <article className="max-w-3xl">
              {article.sections.map((section, i) => (
                <SectionRenderer
                  key={i}
                  section={section}
                />
              ))}

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-10 pt-6 border-t border-ink/10">
                  <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-3">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/news?q=${encodeURIComponent(tag)}`}
                        className="px-3 h-8 rounded-full bg-bgsoft text-sm text-ink hover:bg-primary hover:text-white transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Author box */}
              <div className="mt-10 pt-6 border-t border-ink/10">
                <div className="bg-bgsoft/50 rounded-2xl p-5 flex items-start gap-4">
                  <img
                    src={article.author.avatar}
                    alt={article.author.name}
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-1">
                      Tác giả
                    </div>
                    <h4 className="font-semibold text-ink mb-1">
                      {article.author.name}
                    </h4>
                    <p className="text-sm text-ink-light">
                      {article.author.role}
                    </p>
                  </div>
                </div>
              </div>
            </article>

          {/* Sidebar — TOC + related */}
          <aside className="space-y-6">
            {/* TOC */}
            {toc.length > 1 && (
              <div className="bg-bgsoft/40 border border-ink/10 rounded-2xl p-5 sticky top-20">
                <div className="flex items-center gap-2 mb-3">
                  <IconNote size={16} className="text-primary" />
                  <h3 className="font-semibold text-sm">Mục lục</h3>
                </div>
                <nav className="space-y-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-sm text-ink-light hover:text-primary transition-colors py-1"
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="container-page py-10 md:py-14 border-t border-ink/8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <Badge tone="primary" className="mb-2">
                <IconSparkles size={14} /> Bài viết liên quan
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Cùng chuyên mục: {article.category}
              </h2>
            </div>
            <Link
              to="/news"
              className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
            >
              Xem tất cả <IconArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((a) => (
              <RelatedCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-page py-10 md:py-14">
        <Card className="bg-primary text-white overflow-hidden">
          <div className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <IconWrench size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold mb-1">
                Cần tư vấn chuyên môn?
              </h3>
              <p className="text-white/85 text-sm">
                Đặt lịch dịch vụ hoặc trò chuyện với AI để được hỗ trợ tức thì.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/services">
                <Button variant="secondary" size="md">
                  Đặt lịch ngay
                </Button>
              </Link>
              <Link to="/ai/assistant">
                <Button
                  variant="outline"
                  size="md"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  Hỏi AI
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

// =========================
// Section renderer
// =========================
function SectionRenderer({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case "paragraph":
      return (
        <p className="text-ink leading-relaxed mb-5 text-base md:text-lg">
          {section.text}
        </p>
      );
    case "heading": {
      const Tag = section.level === 2 ? "h2" : "h3";
      return (
        <Tag
          id={section.id}
          className={[
            "font-bold text-ink mt-10 mb-4 scroll-mt-24",
            section.level === 2 ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
          ].join(" ")}
        >
          {section.text}
        </Tag>
      );
    }
    case "list":
      return (
        <ul
          className={[
            "mb-6 space-y-2.5 pl-1",
            section.ordered ? "list-decimal" : "list-none",
            section.ordered ? "pl-6" : "pl-0",
          ].join(" ")}
        >
          {section.items.map((item, i) => (
            <li
              key={i}
              className="text-ink leading-relaxed text-base md:text-lg flex gap-3"
            >
              {!section.ordered && (
                <IconCheck
                  size={20}
                  className="text-primary shrink-0 mt-1"
                />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-primary bg-bgsoft/50 rounded-r-xl p-5 my-6">
          <p className="text-ink italic leading-relaxed text-base md:text-lg">
            "{section.text}"
          </p>
          {section.cite && (
            <cite className="block mt-2 text-xs text-ink-muted not-italic">
              — {section.cite}
            </cite>
          )}
        </blockquote>
      );
    case "callout": {
      const styles = {
        info: {
          bg: "bg-primary/5",
          icon: <IconShield size={20} className="text-primary" />,
        },
        warning: {
          bg: "bg-amber-50",
          icon: <IconWrench size={20} className="text-amber-700" />,
        },
        success: {
          bg: "bg-green-50",
          icon: <IconCheck size={20} className="text-green-700" />,
        },
      }[section.tone];
      return (
        <div
          className={[
            "rounded-2xl p-5 my-6 flex gap-3",
            styles.bg,
          ].join(" ")}
        >
          <div className="shrink-0 mt-0.5">{styles.icon}</div>
          <div>
            <div className="font-semibold text-ink mb-1">{section.title}</div>
            <div className="text-sm text-ink-light leading-relaxed">
              {section.text}
            </div>
          </div>
        </div>
      );
    }
    case "image":
      return (
        <figure className="my-6">
          <div className="rounded-2xl overflow-hidden bg-bgsoft">
            <img
              src={section.src}
              alt={section.caption ?? ""}
              className="w-full h-auto"
            />
          </div>
          {section.caption && (
            <figcaption className="text-xs text-ink-muted text-center mt-2 italic">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
    default:
      return null;
  }
}

// =========================
// Related card
// =========================
function RelatedCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="group block h-full"
    >
      <Card className="h-full flex flex-col hover:shadow-cardHover transition-shadow">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-bgsoft">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge tone="primary" className="absolute top-3 left-3">
            {article.category}
          </Badge>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.6rem]">
            {article.title}
          </h3>
          <div className="mt-auto flex items-center gap-2 text-xs text-ink-muted">
            <IconUser size={14} />
            <span className="line-clamp-1">{article.author.name}</span>
            <span>·</span>
            <span className="flex items-center gap-1 shrink-0">
              <IconClock size={12} /> {article.readMinutes} phút
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}