package com.example.billing_service.service;

/**
 * Độ mịn của kỳ báo cáo.
 *
 * <p>Mỗi giá trị ánh xạ tới một {@code DATE_FORMAT} của MySQL. Chuỗi format
 * được chọn TỪ CODE, không nhận từ client — chặn SQL injection qua tham số
 * {@code periodFormat}.
 */
public enum ReportGranularity {
    /** Theo ngày: {@code "2026-11-27"}. */
    DAY("%Y-%m-%d"),
    /** Theo tuần ISO: {@code "2026-W48"}. */
    WEEK("%x-W%v"),
    /** Theo tháng: {@code "2026-11"}. */
    MONTH("%Y-%m"),
    /** Theo năm: {@code "2026"}. */
    YEAR("%Y");

    private final String periodFormat;

    ReportGranularity(String periodFormat) {
        this.periodFormat = periodFormat;
    }

    public String getPeriodFormat() {
        return periodFormat;
    }
}
