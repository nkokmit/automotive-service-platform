package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.PartCompatibilityRequest;
import com.example.inventory_service.dto.request.PartPricingRequest;
import com.example.inventory_service.dto.request.PartRequest;
import com.example.inventory_service.dto.request.StockAvailabilityRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.dto.response.PartPricingResponse;
import com.example.inventory_service.dto.response.PartResponse;
import com.example.inventory_service.dto.response.StockAvailabilityResponse;
import com.example.inventory_service.service.PartService;
import com.example.inventory_service.service.PartSyncService;
import com.example.inventory_service.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/parts")
@RequiredArgsConstructor
@Validated
@Tag(name = "Phụ tùng", description = "Catalog phụ tùng, tồn kho và các API đồng bộ cho service khác")
public class PartController {

    private static final Set<String> SORT_FIELDS =
            Set.of("sku", "name", "brand", "sellingPrice", "onHandStock", "createdAt");

    private final PartService partService;
    private final StockService stockService;
    private final PartSyncService partSyncService;

    @GetMapping
    @PreAuthorize("hasAuthority('PART_READ')")
    @Operation(summary = "Tìm kiếm phụ tùng",
            description = "Lọc theo keyword, SKU, mã OEM, hãng, nhóm phụ tùng, dòng xe tương thích "
                    + "và trạng thái hoạt động.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả phụ tùng.")
    public ApiResponse<PageResponse<PartResponse>> searchParts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String oemCode,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "false") boolean lowStockOnly,
            @RequestParam(required = false) String vehicleBrand,
            @RequestParam(required = false) String vehicleModel,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(partService.searchParts(keyword, sku, oemCode, brand, categoryId,
                isActive, lowStockOnly, vehicleBrand, vehicleModel,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{partId}")
    @PreAuthorize("hasAuthority('PART_READ')")
    @Operation(summary = "Chi tiết phụ tùng",
            description = "Trả về thông tin phụ tùng kèm tồn thực, tồn giữ chỗ và tồn khả dụng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết phụ tùng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy phụ tùng.")
    public ApiResponse<PartResponse> getPart(@PathVariable UUID partId) {
        return ApiResponse.success(partService.getPartById(partId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    @Operation(summary = "Tạo phụ tùng",
            description = "Tạo mới một mã phụ tùng trong catalog. Tồn kho và giá vốn luôn bắt đầu từ 0.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Phụ tùng đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "SKU đã tồn tại hoặc nhóm phụ tùng không hợp lệ.")
    public ApiResponse<PartResponse> createPart(@Valid @RequestBody PartRequest request) {
        return ApiResponse.success("Tạo phụ tùng thành công", partService.createPart(request));
    }

    @PutMapping("/{partId}")
    @PreAuthorize("hasAuthority('PART_WRITE')")
    @Operation(summary = "Cập nhật phụ tùng",
            description = "Cập nhật thông tin catalog của phụ tùng. Không đổi tồn kho qua API này.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Phụ tùng đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "SKU đã tồn tại hoặc phụ tùng không tồn tại.")
    public ApiResponse<PartResponse> updatePart(@PathVariable UUID partId,
                                                @Valid @RequestBody PartRequest request) {
        return ApiResponse.success("Cập nhật phụ tùng thành công", partService.updatePart(partId, request));
    }

    @DeleteMapping("/{partId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    @Operation(summary = "Vô hiệu hóa phụ tùng",
            description = "Xóa mềm: đặt isActive = false, giữ lại lịch sử kho.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Phụ tùng đã bị vô hiệu hóa.")
    public void deletePart(@PathVariable UUID partId) {
        partService.deletePart(partId);
    }

    @GetMapping("/{partId}/compatibilities")
    @PreAuthorize("hasAuthority('PART_READ')")
    @Operation(summary = "Dòng xe tương thích",
            description = "Liệt kê các dòng xe mà phụ tùng này lắp được.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách dòng xe tương thích.")
    public ApiResponse<List<PartCompatibilityResponse>> getCompatibilities(@PathVariable UUID partId) {
        return ApiResponse.success(partService.getCompatibilities(partId));
    }

    @PostMapping("/{partId}/compatibilities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    @Operation(summary = "Thêm dòng xe tương thích",
            description = "Gắn thêm một dòng xe tương thích cho phụ tùng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Dòng xe tương thích đã được thêm.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Dòng xe tương thích đã tồn tại.")
    public ApiResponse<PartCompatibilityResponse> addCompatibility(
            @PathVariable UUID partId,
            @Valid @RequestBody PartCompatibilityRequest request) {
        return ApiResponse.success("Thêm dòng xe tương thích thành công",
                partService.addCompatibility(partId, request));
    }

    @DeleteMapping("/{partId}/compatibilities/{compatibilityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    @Operation(summary = "Xóa dòng xe tương thích",
            description = "Gỡ một dòng xe tương thích khỏi phụ tùng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Dòng xe tương thích đã bị xóa.")
    public void deleteCompatibility(@PathVariable UUID partId, @PathVariable UUID compatibilityId) {
        partService.deleteCompatibility(partId, compatibilityId);
    }

    @PostMapping("/reserve")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    @Operation(summary = "Giữ chỗ tồn kho",
            description = "Giữ chỗ phụ tùng cho một Work Order. Tồn khả dụng = onHand - reserved.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về các dòng sổ kho RESERVE đã ghi.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không đủ tồn kho để giữ chỗ.")
    public ApiResponse<List<InventoryTransactionResponse>> reserve(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Giữ chỗ tồn kho thành công", stockService.reserve(request));
    }

    @PostMapping("/issue")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    @Operation(summary = "Xuất kho",
            description = "Xuất phụ tùng đã giữ chỗ cho một Work Order: giảm onHand và reserved.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về các dòng sổ kho EXPORT đã ghi.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không đủ tồn kho hoặc thiếu giữ chỗ tương ứng.")
    public ApiResponse<List<InventoryTransactionResponse>> issue(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Xuất kho thành công", stockService.issue(request));
    }

    @PostMapping("/release")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    @Operation(summary = "Giải phóng giữ chỗ",
            description = "Giải phóng phụ tùng đã giữ chỗ cho một Work Order bị hủy.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về các dòng sổ kho RELEASE đã ghi.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy giữ chỗ tương ứng hoặc tồn giữ chỗ không đủ.")
    public ApiResponse<List<InventoryTransactionResponse>> release(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Giải phóng giữ chỗ thành công", stockService.release(request));
    }

    @PostMapping("/check-availability")
    @PreAuthorize("hasAuthority('PART_READ')")
    @Operation(summary = "Kiểm tra tồn kho tức thời",
            description = "API đồng bộ cho service khác (PLAN.md §4.3): trả về tồn khả dụng và cờ đủ hàng "
                    + "cho từng dòng báo giá. Không ghi sổ kho và không phụ thuộc state của client.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về kết quả kiểm tra tồn kho theo từng phụ tùng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Danh sách phụ tùng rỗng hoặc có mã phụ tùng không tồn tại.")
    public ApiResponse<List<StockAvailabilityResponse>> checkAvailability(
            @Valid @RequestBody StockAvailabilityRequest request) {
        return ApiResponse.success(partSyncService.checkAvailability(request));
    }

    @PostMapping("/pricing")
    @PreAuthorize("hasAuthority('PART_READ')")
    @Operation(summary = "Lấy đơn giá phụ tùng",
            description = "API đồng bộ cho service khác (PLAN.md §4.3): trả về đơn giá bán và tổng tiền "
                    + "theo từng dòng báo giá. Không ghi sổ kho và không phụ thuộc state của client.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về đơn giá và tổng tiền theo từng phụ tùng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Danh sách phụ tùng rỗng hoặc có mã phụ tùng không tồn tại.")
    public ApiResponse<List<PartPricingResponse>> pricing(
            @Valid @RequestBody PartPricingRequest request) {
        return ApiResponse.success(partSyncService.getPricing(request));
    }
}
