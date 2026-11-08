package com.example.inventory_service.service;

import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.ServiceBom;
import com.example.inventory_service.mapper.ServiceBomMapper;
import com.example.inventory_service.mapper.ServiceMapper;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.ServiceBomRepository;
import com.example.inventory_service.repository.ServiceCategoryRepository;
import com.example.inventory_service.repository.ServiceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceCatalogServiceImplTest {

    @Mock
    private ServiceRepository serviceRepository;
    @Mock
    private ServiceCategoryRepository serviceCategoryRepository;
    @Mock
    private ServiceBomRepository serviceBomRepository;
    @Mock
    private PartRepository partRepository;
    @Mock
    private ServiceMapper serviceMapper;
    @Mock
    private ServiceBomMapper serviceBomMapper;

    @Test
    void internalBomIncludesPartSnapshotsAndSellingPrice() {
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        com.example.inventory_service.entity.Service service =
                com.example.inventory_service.entity.Service.builder().id(serviceId).build();
        Part part = Part.builder()
                .id(partId)
                .sku("OIL-1")
                .name("Engine oil")
                .unit("L")
                .sellingPrice(BigDecimal.valueOf(40))
                .isActive(true)
                .build();
        ServiceBom bom = ServiceBom.builder()
                .service(service)
                .part(part)
                .defaultQuantity(2)
                .build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(serviceBomRepository.findByServiceIdOrderById(serviceId)).thenReturn(List.of(bom));
        ServiceCatalogServiceImpl catalogService = new ServiceCatalogServiceImpl(
                serviceRepository,
                serviceCategoryRepository,
                serviceBomRepository,
                partRepository,
                serviceMapper,
                serviceBomMapper);

        var result = catalogService.getInternalBom(serviceId);

        assertEquals(1, result.size());
        assertEquals(partId, result.get(0).partId());
        assertEquals("OIL-1", result.get(0).partSku());
        assertEquals(2, result.get(0).defaultQuantity());
        assertEquals(BigDecimal.valueOf(40), result.get(0).sellingPrice());
        assertEquals(true, result.get(0).isActive());
    }
}
