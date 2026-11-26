package com.example.work_order_service.repository;

public interface FeedbackAggregateProjection {

    Long getRatingSum();

    Long getReviewCount();
}
