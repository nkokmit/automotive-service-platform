package com.example.inventory_service.exception;

public class PartCategoryNotFoundException extends ApiException {

    public PartCategoryNotFoundException(String message) {
        super(ErrorCode.PART_CATEGORY_NOT_FOUND, message);
    }
}
