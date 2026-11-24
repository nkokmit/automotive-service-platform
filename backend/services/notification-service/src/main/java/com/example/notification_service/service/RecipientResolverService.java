package com.example.notification_service.service;

import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.exception.RecipientResolutionException;
import com.example.notification_service.integration.client.CustomerVehicleClient;
import com.example.notification_service.integration.client.StaffServiceClient;
import com.example.notification_service.integration.client.UserClient;
import com.example.notification_service.integration.contract.CustomerProfileResponse;
import com.example.notification_service.integration.contract.ServiceApiResponse;
import com.example.notification_service.integration.contract.StaffProfileResponse;
import com.example.notification_service.integration.contract.UserProfileResponse;
import com.example.notification_service.integration.contract.VehicleProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class RecipientResolverService {

    private final CustomerVehicleClient customerVehicleClient;
    private final StaffServiceClient staffServiceClient;
    private final UserClient userClient;

    public RecipientResolverService(
            CustomerVehicleClient customerVehicleClient,
            StaffServiceClient staffServiceClient,
            UserClient userClient
    ) {
        this.customerVehicleClient = customerVehicleClient;
        this.staffServiceClient = staffServiceClient;
        this.userClient = userClient;
    }

    public ResolvedRecipient resolve(RecipientType type, UUID recipientId) {
        return resolve(type, recipientId, null);
    }

    public ResolvedRecipient resolve(RecipientType type, UUID recipientId, UUID vehicleId) {
        if (type == null || recipientId == null) {
            throw new RecipientResolutionException("Recipient type and id are required");
        }

        ResolvedRecipient recipient = switch (type) {
            case CUSTOMER -> resolveCustomer(recipientId);
            case STAFF -> resolveStaff(recipientId);
        };
        if (vehicleId == null) {
            return recipient;
        }

        VehicleProfileResponse vehicle = requireResult(
                customerVehicleClient.getVehicle(vehicleId), "vehicle", vehicleId);
        return new ResolvedRecipient(
                recipient.id(),
                recipient.userId(),
                recipient.type(),
                recipient.fullName(),
                recipient.email(),
                recipient.phone(),
                vehicle.licensePlate()
        );
    }

    private ResolvedRecipient resolveCustomer(UUID customerId) {
        CustomerProfileResponse profile = requireResult(
                customerVehicleClient.getCustomer(customerId), "customer", customerId);
        ContactDetails contact = resolveMissingContact(
                profile.userId(), profile.fullName(), profile.email(), profile.phone());
        return new ResolvedRecipient(
                profile.id(),
                profile.userId(),
                RecipientType.CUSTOMER,
                contact.fullName(),
                contact.email(),
                contact.phone(),
                null
        );
    }

    private ResolvedRecipient resolveStaff(UUID staffId) {
        StaffProfileResponse profile = requireResult(staffServiceClient.getStaffById(staffId), "staff", staffId);
        ContactDetails contact = resolveMissingContact(
                profile.userId(), profile.fullName(), profile.email(), profile.phone());
        return new ResolvedRecipient(
                profile.id(),
                profile.userId(),
                RecipientType.STAFF,
                contact.fullName(),
                contact.email(),
                contact.phone(),
                null
        );
    }

    private ContactDetails resolveMissingContact(
            UUID userId,
            String fullName,
            String email,
            String phone
    ) {
        if (userId == null || (StringUtils.hasText(fullName)
                && StringUtils.hasText(email) && StringUtils.hasText(phone))) {
            return new ContactDetails(fullName, email, phone);
        }

        UserProfileResponse user = requireResult(userClient.getUserById(userId), "user", userId);
        return new ContactDetails(
                firstNonBlank(fullName, user.fullName()),
                firstNonBlank(email, user.email()),
                firstNonBlank(phone, user.phone())
        );
    }

    private String firstNonBlank(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred : fallback;
    }

    private <T> T requireResult(ServiceApiResponse<T> response, String resource, UUID id) {
        if (response == null || response.code() != 0 || response.result() == null) {
            throw new RecipientResolutionException(
                    "Could not resolve " + resource + " recipient data for id " + id
            );
        }
        return response.result();
    }

    private record ContactDetails(String fullName, String email, String phone) {
    }
}
