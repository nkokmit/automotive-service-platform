package com.example.work_order_service.integration;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.integration.client.BookingClient;
import com.example.work_order_service.integration.client.CustomerVehicleClient;
import com.example.work_order_service.integration.client.InventoryServiceClient;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
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

    public ServiceEstimateCatalog getServiceEstimateCatalog(UUID serviceId) {
        ServiceApiResponse<InternalServiceCatalogContract> serviceResponse;
        ServiceApiResponse<List<InternalServiceBomContract>> bomResponse;
        try {
            serviceResponse = inventoryServiceClient.getService(serviceId);
            bomResponse = inventoryServiceClient.getServiceBom(serviceId);
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.SERVICE_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể lấy catalog dịch vụ từ Inventory Service");
        }

        InternalServiceCatalogContract service = serviceResponse == null ? null : serviceResponse.result();
        if (serviceResponse == null || serviceResponse.code() != 0
                || service == null || !serviceId.equals(service.id())
                || service.name() == null || service.name().isBlank()
                || service.durationMinutes() == null || service.durationMinutes() < 0
                || service.requiredTechs() == null || service.requiredTechs() < 0
                || service.baseLaborPrice() == null || service.baseLaborPrice().signum() < 0) {
            throw invalidIntegrationResponse("Inventory Service trả về catalog dịch vụ không hợp lệ");
        }
        if (!Boolean.TRUE.equals(service.isActive())) {
            throw new ApiException(ErrorCode.SERVICE_NOT_ACTIVE);
        }

        List<InternalServiceBomContract> bom = bomResponse == null ? null : bomResponse.result();
        if (bomResponse == null || bomResponse.code() != 0 || bom == null) {
            throw invalidIntegrationResponse("Inventory Service trả về BOM không hợp lệ");
        }
        for (InternalServiceBomContract item : bom) {
            if (item == null || item.partId() == null
                    || item.partSku() == null || item.partSku().isBlank()
                    || item.partName() == null || item.partName().isBlank()
                    || item.partUnit() == null || item.partUnit().isBlank()
                    || item.defaultQuantity() == null || item.defaultQuantity() <= 0
                    || item.sellingPrice() == null || item.sellingPrice().signum() < 0) {
                throw invalidIntegrationResponse("Inventory Service trả về dòng BOM không hợp lệ");
            }
            if (!Boolean.TRUE.equals(item.isActive())) {
                throw new ApiException(ErrorCode.BOM_PART_NOT_ACTIVE);
            }
        }
        return new ServiceEstimateCatalog(service, bom);
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
        }
        VehicleContract vehicle = response == null ? null : response.result();
        if (response == null || response.code() != 0 || vehicle == null || vehicle.id() == null) {
            throw invalidIntegrationResponse("Customer-Vehicle Service trả về dữ liệu xe không hợp lệ");
        }
        return vehicle;
    }

    private ApiException invalidIntegrationResponse(String message) {
        return new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, message);
    }
}
