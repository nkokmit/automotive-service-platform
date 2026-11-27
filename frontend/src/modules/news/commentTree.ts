import type { NewsCommentResponse } from "../../api/types";

/**
 * Khoảng thụt lền (px) cho mỗi cấp bình luận.
 *
 * <p>Dùng chung cho cả trang đọc công khai và modal quản lý để hai nơi
 * hiển thị cây bình luận giống nhau.
 */
export const COMMENT_INDENT_PX = 20;

/**
 * Một bình luận trong cây bình luận (đã gắn bình luận cha và danh sách con).
 */
export interface CommentNode {
  comment: NewsCommentResponse;
  /** Bình luận cha — null nếu là bình luận gốc. */
  parent: NewsCommentResponse | null;
  /** Tên hiển thị của người viết bình luận cha (để hiện "Trả lời <nick>"). */
  parentAuthor: string | null;
  /** Các trả lời trực tiếp của bình luận này. */
  children: CommentNode[];
  /** Độ sâu trong cây (0 = bình luận gốc). */
  depth: number;
}

/**
 * Dựng cây bình luận từ danh sách phẳng.
 *
 * <p>Bình luận gốc (`parentId == null`) nằm ở cấp 0, mỗi bình luận trả lời
 * nằm dưới bình luận cha. Bình luận có cha không còn tồn tại (đã bị xoá) được
 * coi như bình luận gốc để không bị mất khỏi danh sách.
 *
 * <p>Thứ tự giữ nguyên như input — backend đã sắp xếp sẵn theo `sort`.
 *
 * @param comments danh sách bình luận phẳng
 */
export function buildCommentTree(
  comments: NewsCommentResponse[],
): CommentNode[] {
  const byId = new Map<string, NewsCommentResponse>();
  for (const comment of comments) {
    byId.set(comment.id, comment);
  }

  const roots: CommentNode[] = [];
  const childrenOf = new Map<string, CommentNode[]>();

  for (const comment of comments) {
    const parent =
      comment.parentId != null ? byId.get(comment.parentId) ?? null : null;
    const node: CommentNode = {
      comment,
      parent,
      parentAuthor: parent ? (parent.userName ?? "Người dùng") : null,
      children: [],
      depth: 0,
    };
    if (parent) {
      const siblings = childrenOf.get(parent.id);
      if (siblings) {
        siblings.push(node);
      } else {
        childrenOf.set(parent.id, [node]);
      }
    } else {
      roots.push(node);
    }
  }

  // Gắn cây con và tính độ sâu.
  const attach = (node: CommentNode, depth: number): void => {
    node.depth = depth;
    const children = childrenOf.get(node.comment.id) ?? [];
    for (const child of children) {
      node.children.push(child);
      attach(child, depth + 1);
    }
  };
  for (const root of roots) {
    attach(root, 0);
  }

  return roots;
}

/**
 * Duyệt cây bình luận theo thứ tự hiển thị (pre-order) — cha trước con.
 */
export function flattenCommentTree(nodes: CommentNode[]): CommentNode[] {
  const result: CommentNode[] = [];
  const walk = (node: CommentNode): void => {
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  };
  for (const node of nodes) {
    walk(node);
  }
  return result;
}
