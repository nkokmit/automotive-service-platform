package com.example.work_order_service.integration;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.integration.client.BookingClient;
import com.example.work_order_service.integration.client.CustomerVehicleClient;
import com.example.work_order_service.integration.client.InventoryServiceClient;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.CustomerIdentityContract;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.integration.contract.InternalServiceQuoteContract;
import com.example.work_order_service.integration.contract.InternalServiceQuotePartContract;
import com.example.work_order_service.integration.contract.InternalPartCatalogContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.VehicleContract;
import com.example.work_order_service.integration.ServiceEstimateCatalog;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderIntegrationService {

    private final BookingClient bookingClient;
    private final CustomerVehicleClient customerVehicleClient;
    private final InventoryServiceClient inventoryServiceClient;

    public CustomerIdentityContract getCustomerByUserId(UUID userId) {
        ServiceApiResponse<CustomerIdentityContract> response;
        try {
            response = customerVehicleClient.getCustomerByUserId(userId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.CUSTOMER_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể xác định hồ sơ khách hàng từ tài khoản hiện tại");
        }
        CustomerIdentityContract customer = response == null ? null : response.result();
        if (response == null || response.code() != 0 || customer == null
                || customer.customerId() == null || customer.isActive() == null) {
            throw invalidIntegrationResponse("Customer-Vehicle Service trả về hồ sơ khách hàng không hợp lệ");
        }
        if (!customer.isActive()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Hồ sơ khách hàng hiện không hoạt động");
        }
        return customer;
    }

    public ServiceEstimateCatalog getServiceEstimateCatalog(
            UUID serviceId,
            UUID vehicleId,
            boolean includeBom
    ) {
        VehicleContract vehicle = getVehicle(vehicleId);
        if (!vehicleId.equals(vehicle.id())) {
            throw invalidIntegrationResponse("Customer-Vehicle Service trả về xe không khớp Work Order");
        }
        if (!Boolean.TRUE.equals(vehicle.isActive())) {
            throw new ApiException(ErrorCode.VEHICLE_NOT_FOUND);
        }

        ServiceApiResponse<InternalServiceQuoteContract> response;
        try {
            response = inventoryServiceClient.getServiceQuote(serviceId, vehicle.make(), vehicle.model());
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.SERVICE_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể lấy báo giá theo xe từ Inventory Service");
        }

        InternalServiceQuoteContract quote = response == null ? null : response.result();
        if (response == null || response.code() != 0 || quote == null
                || !serviceId.equals(quote.serviceId())
                || quote.serviceName() == null || quote.serviceName().isBlank()
                || quote.durationMinutes() == null || quote.durationMinutes() < 0
                || quote.requiredTechs() == null || quote.requiredTechs() < 0
                || quote.unitPrice() == null || quote.unitPrice().signum() < 0
                || quote.bomParts() == null) {
            throw invalidIntegrationResponse("Inventory Service trả về báo giá dịch vụ không hợp lệ");
        }
        if (!Boolean.TRUE.equals(quote.isActive())) {
            throw new ApiException(ErrorCode.SERVICE_NOT_ACTIVE);
        }

        List<InternalServiceBomContract> bom = quote.bomParts().stream()
                .map(item -> toBomContract(item, includeBom))
                .toList();
        InternalServiceCatalogContract service = new InternalServiceCatalogContract(
                quote.serviceId(), quote.serviceName(), quote.durationMinutes(), quote.requiredTechs(),
                quote.unitPrice(), quote.isActive());
        return new ServiceEstimateCatalog(service, quote.unitPrice(), includeBom ? bom : List.of());
    }

    public InternalPartCatalogContract getPartCatalog(UUID partId) {
        ServiceApiResponse<InternalPartCatalogContract> response;
        try {
            response = inventoryServiceClient.getPart(partId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.PART_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể lấy catalog phụ tùng từ Inventory Service");
        }

        InternalPartCatalogContract part = response == null ? null : response.result();
        if (response == null || response.code() != 0 || part == null
                || !partId.equals(part.id())
                || part.sku() == null || part.sku().isBlank()
                || part.name() == null || part.name().isBlank()
                || part.unit() == null || part.unit().isBlank()
                || part.sellingPrice() == null || part.sellingPrice().signum() < 0) {
            throw invalidIntegrationResponse("Inventory Service trả về catalog phụ tùng không hợp lệ");
        }
        if (!Boolean.TRUE.equals(part.isActive())) {
            throw new ApiException(ErrorCode.PART_NOT_ACTIVE);
        }
        return part;
    }

    public WorkOrderDetailContext requireCheckedInBooking(UUID bookingId) {
        BookingContract booking = getBooking(bookingId);
        if (!"CHECKED_IN".equals(booking.status())) {
            throw new ApiException(ErrorCode.BOOKING_NOT_CHECKED_IN);
        }
        if (booking.vehicleId() == null) {
            throw new ApiException(ErrorCode.BOOKING_VEHICLE_REQUIRED);
        }
        if (booking.customerId() == null) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Booking Service không trả về customerId hợp lệ");
        }

        CustomerContract customer = getCustomer(booking.customerId());
        VehicleContract vehicle = getVehicle(booking.vehicleId());
        if (!booking.customerId().equals(customer.id())
                || !booking.vehicleId().equals(vehicle.id())) {
            throw invalidIntegrationResponse("Dữ liệu Customer-Vehicle không khớp lịch hẹn");
        }
        if (!Boolean.TRUE.equals(vehicle.isActive())) {
            throw new ApiException(ErrorCode.VEHICLE_NOT_FOUND);
        }
        return new WorkOrderDetailContext(booking, customer, vehicle);
    }

    public void requireBookingCheckedIn(UUID bookingId, UUID customerId, UUID vehicleId) {
        BookingContract booking = getBooking(bookingId);
        if (!bookingId.equals(booking.id())
                || !customerId.equals(booking.customerId())
                || !vehicleId.equals(booking.vehicleId())) {
            throw invalidIntegrationResponse("Booking không khớp dữ liệu của sự kiện check-in");
        }
        if (!"CHECKED_IN".equals(booking.status()) && !"FULFILLED".equals(booking.status())) {
            throw new ApiException(ErrorCode.BOOKING_NOT_CHECKED_IN);
        }
    }

    public WorkOrderDetailContext getDetailContext(WorkOrder workOrder) {
        BookingContract booking = getBooking(workOrder.getBookingId());
        if (!workOrder.getBookingId().equals(booking.id())) {
            throw invalidIntegrationResponse("Booking Service trả về lịch hẹn không khớp Work Order");
        }
        if (!workOrder.getCustomerId().equals(booking.customerId())
                || !workOrder.getVehicleId().equals(booking.vehicleId())) {
            throw invalidIntegrationResponse("Booking không khớp customer/vehicle của Work Order");
        }
        if (booking.workOrderId() != null && !workOrder.getId().equals(booking.workOrderId())) {
            throw invalidIntegrationResponse("Booking đã được liên kết với Work Order khác");
        }

        CustomerContract customer = getCustomer(workOrder.getCustomerId());
        VehicleContract vehicle = getVehicle(workOrder.getVehicleId());
        if (!workOrder.getCustomerId().equals(customer.id())
                || !workOrder.getVehicleId().equals(vehicle.id())) {
            throw invalidIntegrationResponse("Dữ liệu Customer-Vehicle không khớp Work Order");
        }
        return new WorkOrderDetailContext(booking, customer, vehicle);
    }

    private BookingContract getBooking(UUID bookingId) {
        ServiceApiResponse<BookingContract> response;
        try {
            response = bookingClient.getBooking(bookingId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.BOOKING_NOT_FOUND);
        }
        BookingContract booking = response == null ? null : response.result();
        if (response == null || response.code() != 0 || booking == null || booking.id() == null) {
            throw invalidIntegrationResponse("Booking Service trả về dữ liệu lịch hẹn không hợp lệ");
        }
        return booking;
    }

    private CustomerContract getCustomer(UUID customerId) {
        ServiceApiResponse<CustomerContract> response;
        try {
            response = customerVehicleClient.getCustomer(customerId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.CUSTOMER_NOT_FOUND);
        }
        CustomerContract customer = response == null ? null : response.result();
        if (response == null || response.code() != 0 || customer == null || customer.id() == null) {
            throw invalidIntegrationResponse("Customer-Vehicle Service trả về dữ liệu khách hàng không hợp lệ");
        }
        return customer;
    }

    private VehicleContract getVehicle(UUID vehicleId) {
        ServiceApiResponse<VehicleContract> response;
        try {
            response = customerVehicleClient.getVehicle(vehicleId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.VEHICLE_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể lấy thông tin xe từ Customer-Vehicle Service");
        }
        VehicleContract vehicle = response == null ? null : response.result();
        if (response == null || response.code() != 0 || vehicle == null || vehicle.id() == null) {
            throw invalidIntegrationResponse("Customer-Vehicle Service trả về dữ liệu xe không hợp lệ");
        }
        return vehicle;
    }

    private InternalServiceBomContract toBomContract(
            InternalServiceQuotePartContract item,
            boolean requireActive
    ) {
        if (item == null || item.partId() == null
                || item.partSku() == null || item.partSku().isBlank()
                || item.partName() == null || item.partName().isBlank()
                || item.partUnit() == null || item.partUnit().isBlank()
                || item.quantity() == null || item.quantity() <= 0
                || item.unitPrice() == null || item.unitPrice().signum() < 0
                || item.availableStock() == null || item.availableStock() < 0) {
            throw invalidIntegrationResponse("Inventory Service trả về phụ tùng trong báo giá không hợp lệ");
        }
        if (requireActive && !Boolean.TRUE.equals(item.isActive())) {
            throw new ApiException(ErrorCode.BOM_PART_NOT_ACTIVE);
        }
        return new InternalServiceBomContract(
                item.partId(), item.partSku(), item.partName(), item.partUnit(),
                item.quantity(), item.unitPrice(), item.isActive());
    }

    private ApiException invalidIntegrationResponse(String message) {
        return new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, message);
    }
}
