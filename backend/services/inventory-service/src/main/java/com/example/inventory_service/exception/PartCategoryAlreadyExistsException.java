package com.example.inventory_service.exception;

public class PartCategoryAlreadyExistsException extends ApiException {

    public PartCategoryAlreadyExistsException(String message) {
        super(ErrorCode.PART_CATEGORY_ALREADY_EXISTS, message);
    }
}
