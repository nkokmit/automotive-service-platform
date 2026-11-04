package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.ServiceBomRequest;
import com.example.inventory_service.dto.request.ServiceBomUpdateRequest;
import com.example.inventory_service.dto.request.ServiceRequest;
import com.example.inventory_service.dto.response.ServiceBomResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.service.ServiceCatalogService;
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
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Validated
@Tag(name = "Dịch vụ", description = "Catalog dịch vụ và định mức phụ tùng (BOM)")
public class ServiceController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "baseLaborPrice", "createdAt");

    private final ServiceCatalogService serviceCatalogService;

    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    @Operation(summary = "Danh sách dịch vụ",
            description = "Phân trang và lọc theo keyword, nhóm dịch vụ hoặc trạng thái hoạt động.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả dịch vụ.")
    public ApiResponse<PageResponse<ServiceResponse>> getServices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(serviceCatalogService.getServices(keyword, categoryId, isActive,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    @Operation(summary = "Chi tiết dịch vụ",
            description = "Trả về chi tiết dịch vụ kèm thời lượng và số kỹ thuật viên yêu cầu "
                    + "(contract với booking-service).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết dịch vụ.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy dịch vụ.")
    public ApiResponse<ServiceResponse> getService(@PathVariable UUID serviceId) {
        return ApiResponse.success(serviceCatalogService.getServiceById(serviceId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Tạo dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Dịch vụ đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã dịch vụ đã tồn tại hoặc nhóm dịch vụ không hợp lệ.")
    public ApiResponse<ServiceResponse> createService(@Valid @RequestBody ServiceRequest request) {
        return ApiResponse.success("Tạo dịch vụ thành công", serviceCatalogService.createService(request));
    }

    @PutMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Cập nhật dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Dịch vụ đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã dịch vụ đã tồn tại hoặc dịch vụ không tồn tại.")
    public ApiResponse<ServiceResponse> updateService(@PathVariable UUID serviceId,
                                                      @Valid @RequestBody ServiceRequest request) {
        return ApiResponse.success("Cập nhật dịch vụ thành công",
                serviceCatalogService.updateService(serviceId, request));
    }

    @DeleteMapping("/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Xóa dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Dịch vụ đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Dịch vụ đang được sử dụng.")
    public void deleteService(@PathVariable UUID serviceId) {
        serviceCatalogService.deleteService(serviceId);
    }

    @GetMapping("/{serviceId}/bom")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    @Operation(summary = "Định mức phụ tùng của dịch vụ",
            description = "Trả về danh sách phụ tùng mặc định kèm theo dịch vụ (BOM).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách định mức phụ tùng.")
    public ApiResponse<List<ServiceBomResponse>> getBom(@PathVariable UUID serviceId) {
        return ApiResponse.success(serviceCatalogService.getBom(serviceId));
    }

    @PostMapping("/{serviceId}/bom")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Thêm phụ tùng vào định mức")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Đã thêm phụ tùng vào định mức.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Phụ tùng đã có trong định mức của dịch vụ.")
    public ApiResponse<ServiceBomResponse> addBomItem(@PathVariable UUID serviceId,
                                                      @Valid @RequestBody ServiceBomRequest request) {
        return ApiResponse.success("Thêm phụ tùng vào định mức thành công",
                serviceCatalogService.addBomItem(serviceId, request));
    }

    @PutMapping("/{serviceId}/bom/{bomId}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Cập nhật dòng định mức")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Dòng định mức đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy dòng định mức hoặc phụ tùng đã có trong định mức.")
    public ApiResponse<ServiceBomResponse> updateBomItem(@PathVariable UUID serviceId,
                                                        @PathVariable UUID bomId,
                                                        @Valid @RequestBody ServiceBomUpdateRequest request) {
        return ApiResponse.success("Cập nhật định mức thành công",
                serviceCatalogService.updateBomItem(serviceId, bomId, request));
    }

    @DeleteMapping("/{serviceId}/bom/{bomId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Xóa dòng định mức")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Dòng định mức đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy dòng định mức.")
    public void deleteBomItem(@PathVariable UUID serviceId, @PathVariable UUID bomId) {
        serviceCatalogService.deleteBomItem(serviceId, bomId);
    }
}
