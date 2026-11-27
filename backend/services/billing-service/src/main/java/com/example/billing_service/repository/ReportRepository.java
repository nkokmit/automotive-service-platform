package com.example.billing_service.repository;

import com.example.billing_service.enums.InvoiceItemType;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.enums.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

/**
 * Truy vấn tổng hợp cho module báo cáo & thống kê.
 *
 * <p>Tất cả dữ liệu đều nằm trong database {@code billing_service} — không cần
 * join chéo service khác, không vi phạm GLOBAL_RULES §1.
 *
 * <p>QUY ƯỚC VỀ THỜI GIAN:
 * <ul>
 *   <li>Doanh thu dùng {@code invoices.issued_at} (thời điểm phát hành).</li>
 *   <li>Dòng tiền dùng {@code payments.paid_at} (thời điểm thu tiền).</li>
 *   <li>Khoảng lọc luôn là <b>[from, to)</b> —半 mở, để các kỳ liền nhau không
 *       cộng trùng bản ghi ở ranh giới.</li>
 * </ul>
 */
public interface ReportRepository extends JpaRepository<com.example.billing_service.entity.Invoice, java.util.UUID> {

    /**
     * Tổng quan doanh thu theo hóa đơn phát hành trong kỳ.
     *
     * <p>Tách VOID ra để đếm riêng — hóa đơn VOID không cộng vào doanh thu.
     */
    @Query("""
            SELECT
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.subtotalLabor ELSE 0 END), 0) AS totalLabor,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.subtotalParts ELSE 0 END), 0) AS totalParts,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.discountAmount ELSE 0 END), 0) AS totalDiscount,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.taxAmount ELSE 0 END), 0) AS totalTax,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.grandTotal ELSE 0 END), 0) AS netRevenue,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN 1 ELSE 0 END), 0) AS invoiceCount,
                COALESCE(SUM(CASE WHEN i.status = com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN 1 ELSE 0 END), 0) AS voidedInvoiceCount,
                COALESCE(SUM(CASE WHEN i.status <> com.example.billing_service.enums.InvoiceStatus.VOID
                                  THEN i.paidAmount ELSE 0 END), 0) AS paidAmount
            FROM Invoice i
            WHERE i.issuedAt >= :from AND i.issuedAt < :to
            """)
    RevenueSummaryProjection summarizeInvoices(
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Tiền thực thu trong kỳ (theo {@code paid_at}).
     *
     * <p>Chỉ tính giao dịch còn hiệu lực. Giao dịch đã hoàn được tính riêng
     * để báo cáo "đã hoàn trong kỳ".
     */
    @Query("""
            SELECT
                COALESCE(SUM(CASE WHEN p.status = com.example.billing_service.enums.PaymentStatus.SUCCEEDED
                                  THEN p.amount ELSE 0 END), 0) AS collectedRevenue,
                COALESCE(SUM(CASE WHEN p.status = com.example.billing_service.enums.PaymentStatus.REFUNDED
                                  THEN p.amount ELSE 0 END), 0) AS refundedRevenue
            FROM Payment p
            WHERE p.paidAt >= :from AND p.paidAt < :to
            """)
    PaymentAggregateProjection summarizePayments(
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Doanh thu gom theo hạng mục (dịch vụ / phụ tùng).
     *
     * <p>Chỉ tính hóa đơn không VOID.
     *
     * <p>{@code netRevenue} phân bổ chiết khấu/thuế của hóa đơn cho từng dòng
     * theo TỈ LỆ GIÁ TRỊ dòng đó — đảm bảo tổng net của mọi hạng mục khớp
     * đúng với tổng {@code grand_total} của các hóa đơn đã phát hành.
     */
    @Query("""
            SELECT
                item.catalogId AS catalogId,
                item.itemType AS itemType,
                item.snapshotCode AS snapshotCode,
                item.snapshotName AS snapshotName,
                SUM(item.quantity) AS quantity,
                SUM(item.totalPrice) AS grossRevenue,
                SUM(CASE WHEN invoice.subtotalLabor + invoice.subtotalParts > 0
                    THEN item.totalPrice * invoice.grandTotal
                         / (invoice.subtotalLabor + invoice.subtotalParts)
                    ELSE item.totalPrice END) AS netRevenue
            FROM InvoiceItem item
            JOIN item.invoice invoice
            WHERE invoice.status <> com.example.billing_service.enums.InvoiceStatus.VOID
              AND invoice.issuedAt >= :from AND invoice.issuedAt < :to
              AND (:itemType IS NULL OR item.itemType = :itemType)
            GROUP BY item.catalogId, item.itemType, item.snapshotCode, item.snapshotName
            ORDER BY SUM(item.totalPrice) DESC
            """)
    List<RevenueByItemProjection> revenueByItem(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("itemType") InvoiceItemType itemType);

    /**
     * Doanh thu gom theo kỳ.
     *
     * <p>Định dạng kỳ được tính bằng {@code DATE_FORMAT} để server và client
     * luôn dùng cùng một múi giờ (Asia/Ho_Chi_Minh theo cấu hình MySQL).
     *
     * <p>{@code periodExpression} là biểu thức định dạng do service chọn, KHÔNG
     * nhận từ client — chặn SQL injection qua tham số này.
     */
    @Query(value = """
            SELECT
                DATE_FORMAT(invoice.issued_at, :periodFormat) AS period,
                SUM(item.total_price) AS grossRevenue,
                SUM(CASE WHEN invoice.subtotal_labor + invoice.subtotal_parts > 0
                    THEN item.total_price * invoice.grand_total
                         / (invoice.subtotal_labor + invoice.subtotal_parts)
                    ELSE item.total_price END) AS netRevenue,
                SUM(CASE WHEN item.item_type = 'SERVICE' THEN item.total_price ELSE 0 END) AS laborRevenue,
                SUM(CASE WHEN item.item_type = 'PART' THEN item.total_price ELSE 0 END) AS partsRevenue,
                COUNT(DISTINCT invoice.id) AS invoiceCount
            FROM billing_service.invoice_items item
            JOIN billing_service.invoices invoice ON invoice.id = item.invoice_id
            WHERE invoice.status <> 'VOID'
              AND invoice.issued_at >= :from AND invoice.issued_at < :to
            GROUP BY DATE_FORMAT(invoice.issued_at, :periodFormat)
            ORDER BY period ASC
            """, nativeQuery = true)
    List<RevenueByPeriodProjection> revenueByPeriod(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("periodFormat") String periodFormat);

    /**
     * Thanh toán gom theo phương thức.
     *
     * <p>Đếm giao dịch theo {@code paid_at} — cùng kỳ với dòng tiền thực.
     */
    @Query("""
            SELECT
                p.paymentMethod AS paymentMethod,
                COUNT(p.id) AS transactionCount,
                COALESCE(SUM(CASE WHEN p.status = com.example.billing_service.enums.PaymentStatus.SUCCEEDED
                                  THEN p.amount ELSE 0 END), 0) AS collectedAmount,
                COALESCE(SUM(CASE WHEN p.status = com.example.billing_service.enums.PaymentStatus.REFUNDED
                                  THEN p.amount ELSE 0 END), 0) AS refundedAmount
            FROM Payment p
            WHERE p.paidAt >= :from AND p.paidAt < :to
            GROUP BY p.paymentMethod
            ORDER BY collectedAmount DESC
            """)
    List<PaymentBreakdownProjection> paymentBreakdown(
            @Param("from") Instant from,
            @Param("to") Instant to);
}
