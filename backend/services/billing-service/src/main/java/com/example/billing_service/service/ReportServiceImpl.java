package com.example.billing_service.service;

import com.example.billing_service.dto.response.PaymentBreakdownResponse;
import com.example.billing_service.dto.response.RevenueByCategoryResponse;
import com.example.billing_service.dto.response.RevenueByItemResponse;
import com.example.billing_service.dto.response.RevenueOverviewResponse;
import com.example.billing_service.dto.response.RevenuePeriodResponse;
import com.example.billing_service.enums.InvoiceItemType;
import com.example.billing_service.integration.client.InventoryServiceClient;
import com.example.billing_service.integration.contract.ServiceApiResponse;
import com.example.billing_service.integration.contract.ServiceCatalogContract;
import com.example.billing_service.repository.PaymentAggregateProjection;
import com.example.billing_service.repository.PaymentBreakdownProjection;
import com.example.billing_service.repository.RevenueByItemProjection;
import com.example.billing_service.repository.RevenueByPeriodProjection;
import com.example.billing_service.repository.RevenueSummaryProjection;
import com.example.billing_service.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Triển khai module báo cáo & thống kê.
 *
 * <p>NGUỒN DỮ LIỆU (tất cả trong database {@code billing_service}):
 * <ul>
 *   <li>{@code invoices} — doanh thu ghi nhận, chiết khấu, thuế, công nợ</li>
 *   <li>{@code invoice_items} — doanh thu theo dịch vụ / phụ tùng</li>
 *   <li>{@code payments} — dòng tiền thực (đã thu / đã hoàn)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    /** Nhóm dịch vụ dùng cho hạng mục là PHỤ TÙNG (phụ tùng không thuộc nhóm dịch vụ). */
    private static final String PARTS_CATEGORY_NAME = "Phụ tùng";

    /** Số hạng mục tối đa trả về — tránh response quá lớn khi kỳ báo cáo rộng. */
    private static final int MAX_ITEMS = 200;

    private final ReportRepository reportRepository;
    private final InventoryServiceClient inventoryServiceClient;

    @Override
    @Transactional(readOnly = true)
    public RevenueOverviewResponse overview(Instant from, Instant to) {
        RevenueSummaryProjection summary = reportRepository.summarizeInvoices(from, to);
        PaymentAggregateProjection payments = reportRepository.summarizePayments(from, to);

        BigDecimal labor = zero(summary == null ? null : summary.getTotalLabor());
        BigDecimal parts = zero(summary == null ? null : summary.getTotalParts());
        BigDecimal discount = zero(summary == null ? null : summary.getTotalDiscount());
        BigDecimal tax = zero(summary == null ? null : summary.getTotalTax());
        BigDecimal net = zero(summary == null ? null : summary.getNetRevenue());
        long invoiceCount = summary == null || summary.getInvoiceCount() == null ? 0 : summary.getInvoiceCount();
        long voidedCount = summary == null || summary.getVoidedInvoiceCount() == null ? 0 : summary.getVoidedInvoiceCount();

        // Gross = công lao động + phụ tùng (chưa trừ chiết khấu, chưa cộng thuế).
        BigDecimal gross = labor.add(parts).setScale(2, RoundingMode.HALF_UP);

        BigDecimal collected = zero(payments == null ? null : payments.getCollectedRevenue());
        BigDecimal refunded = zero(payments == null ? null : payments.getRefundedRevenue());

        // Công nợ = doanh thu thuần đã phát hành − tiền đã thu trên các hóa đơn đó.
        BigDecimal paidOnInvoices = zero(summary == null ? null : summary.getPaidAmount());
        BigDecimal outstanding = net.subtract(paidOnInvoices).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        BigDecimal average = invoiceCount == 0
                ? BigDecimal.ZERO.setScale(2)
                : net.divide(BigDecimal.valueOf(invoiceCount), 2, RoundingMode.HALF_UP);

        BigDecimal laborRatio = gross.signum() == 0
                ? BigDecimal.ZERO
                : labor.divide(gross, 4, RoundingMode.HALF_UP);
        BigDecimal partsRatio = gross.signum() == 0
                ? BigDecimal.ZERO
                : parts.divide(gross, 4, RoundingMode.HALF_UP);

        return new RevenueOverviewResponse(
                gross,
                labor,
                parts,
                discount,
                tax,
                net,
                invoiceCount,
                voidedCount,
                collected,
                refunded,
                outstanding,
                average,
                laborRatio,
                partsRatio);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenuePeriodResponse> revenueByPeriod(
            Instant from,
            Instant to,
            ReportGranularity granularity) {
        ReportGranularity effective = granularity == null ? ReportGranularity.MONTH : granularity;
        return reportRepository.revenueByPeriod(from, to, effective.getPeriodFormat()).stream()
                .map(this::toPeriodResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueByItemResponse> revenueByItem(
            Instant from,
            Instant to,
            InvoiceItemType itemType) {
        List<RevenueByItemProjection> rows = reportRepository.revenueByItem(from, to, itemType);
        if (rows.isEmpty()) {
            return List.of();
        }

        BigDecimal totalGross = rows.stream()
                .map(row -> zero(row.getGrossRevenue()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<RevenueByItemResponse> result = new ArrayList<>(rows.size());
        for (RevenueByItemProjection row : rows) {
            BigDecimal gross = zero(row.getGrossRevenue());
            BigDecimal ratio = totalGross.signum() == 0
                    ? BigDecimal.ZERO
                    : gross.divide(totalGross, 4, RoundingMode.HALF_UP);
            result.add(new RevenueByItemResponse(
                    row.getCatalogId(),
                    row.getItemType(),
                    row.getSnapshotCode(),
                    row.getSnapshotName(),
                    row.getQuantity() == null ? 0 : row.getQuantity(),
                    gross,
                    zero(row.getNetRevenue()),
                    ratio));
        }
        return result.size() > MAX_ITEMS ? result.subList(0, MAX_ITEMS) : result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueByCategoryResponse> revenueByCategory(Instant from, Instant to) {
        // Chỉ lấy hạng mục dịch vụ — phụ tùng gom vào nhóm riêng.
        List<RevenueByItemProjection> rows = reportRepository.revenueByItem(from, to, InvoiceItemType.SERVICE);
        if (rows.isEmpty()) {
            return List.of();
        }

        // Gom nhóm cần biết nhóm của từng dịch vụ → gọi inventory-service MỘT lần.
        List<UUID> serviceIds = rows.stream()
                .map(RevenueByItemProjection::getCatalogId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, ServiceCatalogContract> catalogByService = fetchCatalog(serviceIds);

        // Gom theo (categoryId, categoryName).
        Map<String, CategoryBucket> buckets = new LinkedHashMap<>();
        BigDecimal totalGross = BigDecimal.ZERO;

        for (RevenueByItemProjection row : rows) {
            ServiceCatalogContract catalog = catalogByService.get(row.getCatalogId());
            UUID categoryId = catalog == null ? null : catalog.categoryId();
            String categoryName = catalog == null ? "Dịch vụ khác" : catalog.categoryName();

            String key = (categoryId == null ? "unknown" : categoryId.toString()) + "|" + categoryName;
            CategoryBucket bucket = buckets.computeIfAbsent(key, ignored -> new CategoryBucket(categoryId, categoryName));
            bucket.gross = bucket.gross.add(zero(row.getGrossRevenue()));
            bucket.net = bucket.net.add(zero(row.getNetRevenue()));
            bucket.itemCount += 1;
            totalGross = totalGross.add(zero(row.getGrossRevenue()));
        }

        // Phụ tùng gom vào nhóm riêng — không thuộc nhóm dịch vụ nào.
        List<RevenueByItemProjection> partRows = reportRepository.revenueByItem(from, to, InvoiceItemType.PART);
        if (!partRows.isEmpty()) {
            CategoryBucket partsBucket = new CategoryBucket(null, PARTS_CATEGORY_NAME);
            for (RevenueByItemProjection row : partRows) {
                partsBucket.gross = partsBucket.gross.add(zero(row.getGrossRevenue()));
                partsBucket.net = partsBucket.net.add(zero(row.getNetRevenue()));
                partsBucket.itemCount += 1;
                totalGross = totalGross.add(zero(row.getGrossRevenue()));
            }
            buckets.put(PARTS_CATEGORY_NAME, partsBucket);
        }

        final BigDecimal grandTotal = totalGross;
        return buckets.values().stream()
                .map(bucket -> new RevenueByCategoryResponse(
                        bucket.categoryId,
                        bucket.categoryName,
                        bucket.gross,
                        bucket.net,
                        bucket.itemCount,
                        grandTotal.signum() == 0
                                ? BigDecimal.ZERO
                                : bucket.gross.divide(grandTotal, 4, RoundingMode.HALF_UP)))
                .sorted((a, b) -> b.grossRevenue().compareTo(a.grossRevenue()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentBreakdownResponse> paymentBreakdown(Instant from, Instant to) {
        List<PaymentBreakdownProjection> rows = reportRepository.paymentBreakdown(from, to);
        if (rows.isEmpty()) {
            return List.of();
        }

        BigDecimal total = rows.stream()
                .map(row -> zero(row.getCollectedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream()
                .map(row -> new PaymentBreakdownResponse(
                        row.getPaymentMethod(),
                        row.getTransactionCount() == null ? 0 : row.getTransactionCount(),
                        zero(row.getCollectedAmount()),
                        zero(row.getRefundedAmount()),
                        total.signum() == 0
                                ? BigDecimal.ZERO
                                : zero(row.getCollectedAmount()).divide(total, 4, RoundingMode.HALF_UP)))
                .toList();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Gọi inventory-service lấy nhóm dịch vụ cho nhiều dịch vụ trong MỘT lần.
     *
     * <p>Nếu service không khả dụng → trả map rỗng, báo cáo vẫn chạy được với
     * nhóm "Dịch vụ khác" thay vì trả 500 cho toàn bộ báo cáo.
     */
    private Map<UUID, ServiceCatalogContract> fetchCatalog(List<UUID> serviceIds) {
        Map<UUID, ServiceCatalogContract> result = new HashMap<>();
        if (serviceIds.isEmpty()) {
            return result;
        }
        try {
            ServiceApiResponse<List<ServiceCatalogContract>> response =
                    inventoryServiceClient.getServiceCatalogBatch(serviceIds);
            if (response == null || response.code() != 0 || response.result() == null) {
                log.warn("inventory-service trả về kết quả không hợp lệ cho danh mục dịch vụ");
                return result;
            }
            for (ServiceCatalogContract contract : response.result()) {
                result.put(contract.id(), contract);
            }
        } catch (Exception exception) {
            log.warn("Không gọi được inventory-service để lấy nhóm dịch vụ: {}", exception.getMessage());
        }
        return result;
    }

    private RevenuePeriodResponse toPeriodResponse(RevenueByPeriodProjection row) {
        return new RevenuePeriodResponse(
                row.getPeriod(),
                zero(row.getGrossRevenue()),
                zero(row.getNetRevenue()),
                zero(row.getLaborRevenue()),
                zero(row.getPartsRevenue()),
                row.getInvoiceCount() == null ? 0 : row.getInvoiceCount());
    }

    private static BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /** Bucket tạm để gom doanh thu theo nhóm. */
    private static final class CategoryBucket {
        private final UUID categoryId;
        private final String categoryName;
        private BigDecimal gross = BigDecimal.ZERO;
        private BigDecimal net = BigDecimal.ZERO;
        private long itemCount;

        private CategoryBucket(UUID categoryId, String categoryName) {
            this.categoryId = categoryId;
            this.categoryName = categoryName;
        }
    }
}
