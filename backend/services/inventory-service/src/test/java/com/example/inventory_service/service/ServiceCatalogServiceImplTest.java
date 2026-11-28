package com.example.inventory_service.service;

import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.ServiceBom;
import com.example.inventory_service.entity.ServiceVehiclePricing;
import com.example.inventory_service.dto.request.ServiceVehiclePricingRequest;
import com.example.inventory_service.mapper.ServiceBomMapper;
import com.example.inventory_service.mapper.ServiceMapper;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.ServiceBomRepository;
import com.example.inventory_service.repository.ServiceCategoryRepository;
import com.example.inventory_service.repository.ServiceRepository;
import com.example.inventory_service.repository.ServiceVehiclePricingRepository;
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
    @Mock
    private ServiceVehiclePricingRepository serviceVehiclePricingRepository;

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
                serviceBomMapper,
                serviceVehiclePricingRepository);

        var result = catalogService.getInternalBom(serviceId);

        assertEquals(1, result.size());
        assertEquals(partId, result.get(0).partId());
        assertEquals("OIL-1", result.get(0).partSku());
        assertEquals(2, result.get(0).defaultQuantity());
        assertEquals(BigDecimal.valueOf(40), result.get(0).sellingPrice());
        assertEquals(true, result.get(0).isActive());
    }

    @Test
    void quoteUsesExactVehiclePricingAndBom() {
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        com.example.inventory_service.entity.Service service = com.example.inventory_service.entity.Service.builder()
                .id(serviceId)
                .name("Oil change")
                .baseLaborPrice(BigDecimal.valueOf(500))
                .durationMinutes(30)
                .requiredTechs(1)
                .isActive(true)
                .build();
        ServiceVehiclePricing pricing = ServiceVehiclePricing.builder()
                .service(service)
                .brand("TOYOTA")
                .model("FORTUNER")
                .unitPrice(BigDecimal.valueOf(750))
                .durationMinutes(45)
                .build();
        Part part = Part.builder().id(partId).sku("OIL-1").name("Oil").unit("L")
                .sellingPrice(BigDecimal.valueOf(100)).onHandStock(12).reservedStock(3).isActive(true).build();
        ServiceBom bom = ServiceBom.builder().service(service).part(part)
                .brand("TOYOTA").model("FORTUNER").defaultQuantity(7).build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "TOYOTA", "FORTUNER"))
                .thenReturn(Optional.of(pricing));
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "TOYOTA", "FORTUNER"))
                .thenReturn(List.of(bom));

        var quote = service().getQuote(serviceId, " toyota ", " fortuner ");

        assertEquals(BigDecimal.valueOf(750), quote.unitPrice());
        assertEquals(45, quote.durationMinutes());
        assertEquals("EXACT", quote.pricingSource());
        assertEquals("EXACT", quote.bomSource());
        assertEquals(7, quote.bomParts().get(0).quantity());
        assertEquals(9, quote.bomParts().get(0).availableStock());
    }

    @Test
    void quoteFallsBackToBrandPricingAndDefaultBom() {
        UUID serviceId = UUID.randomUUID();
        com.example.inventory_service.entity.Service service = com.example.inventory_service.entity.Service.builder()
                .id(serviceId)
                .name("Oil change")
                .baseLaborPrice(BigDecimal.valueOf(500))
                .durationMinutes(30)
                .requiredTechs(1)
                .isActive(true)
                .build();
        ServiceVehiclePricing pricing = ServiceVehiclePricing.builder()
                .service(service)
                .brand("TOYOTA")
                .model("ALL")
                .unitPrice(BigDecimal.valueOf(600))
                .durationMinutes(40)
                .build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "TOYOTA", "VIOS"))
                .thenReturn(Optional.empty());
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "TOYOTA", "ALL"))
                .thenReturn(Optional.of(pricing));
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "TOYOTA", "VIOS"))
                .thenReturn(List.of());
        Part part = Part.builder().id(UUID.randomUUID()).sku("OIL-1").name("Oil").unit("L")
                .sellingPrice(BigDecimal.valueOf(100)).onHandStock(12).reservedStock(3).isActive(true).build();
        ServiceBom brandBom = ServiceBom.builder().service(service).part(part)
                .brand("TOYOTA").model("ALL").defaultQuantity(5).build();
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "TOYOTA", "ALL"))
                .thenReturn(List.of(brandBom));
        var quote = service().getQuote(serviceId, "toyota", "vios");

        assertEquals(BigDecimal.valueOf(600), quote.unitPrice());
        assertEquals(40, quote.durationMinutes());
        assertEquals("BRAND", quote.pricingSource());
        assertEquals("BRAND", quote.bomSource());
        assertEquals(5, quote.bomParts().get(0).quantity());
    }

    @Test
    void quoteFallsBackToBasePriceWhenNoVehiclePricingExists() {
        UUID serviceId = UUID.randomUUID();
        com.example.inventory_service.entity.Service service = com.example.inventory_service.entity.Service.builder()
                .id(serviceId)
                .name("Oil change")
                .baseLaborPrice(BigDecimal.valueOf(500))
                .durationMinutes(30)
                .requiredTechs(1)
                .isActive(true)
                .build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "HONDA", "CIVIC"))
                .thenReturn(Optional.empty());
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "HONDA", "ALL"))
                .thenReturn(Optional.empty());
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "HONDA", "CIVIC"))
                .thenReturn(List.of());
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "HONDA", "ALL"))
                .thenReturn(List.of());
        Part part = Part.builder().id(UUID.randomUUID()).sku("OIL-1").name("Oil").unit("L")
                .sellingPrice(BigDecimal.valueOf(100)).onHandStock(12).reservedStock(3).isActive(true).build();
        ServiceBom defaultBom = ServiceBom.builder().service(service).part(part)
                .brand("ALL").model("ALL").defaultQuantity(4).build();
        when(serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(serviceId, "ALL", "ALL"))
                .thenReturn(List.of(defaultBom));

        var quote = service().getQuote(serviceId, "honda", "civic");

        assertEquals(BigDecimal.valueOf(500), quote.unitPrice());
        assertEquals(30, quote.durationMinutes());
        assertEquals("BASE", quote.pricingSource());
        assertEquals("DEFAULT", quote.bomSource());
        assertEquals(4, quote.bomParts().get(0).quantity());
    }

    @Test
    void upsertNormalizesVehicleKeyBeforeFindingExistingConfiguration() {
        UUID serviceId = UUID.randomUUID();
        com.example.inventory_service.entity.Service service = com.example.inventory_service.entity.Service.builder()
                .id(serviceId).build();
        ServiceVehiclePricing existing = ServiceVehiclePricing.builder()
                .id(UUID.randomUUID())
                .service(service)
                .brand("TOYOTA")
                .model("CAMRY")
                .unitPrice(BigDecimal.valueOf(500))
                .durationMinutes(30)
                .build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(serviceVehiclePricingRepository.findByServiceIdAndBrandAndModel(serviceId, "TOYOTA", "CAMRY"))
                .thenReturn(Optional.of(existing));
        when(serviceVehiclePricingRepository.save(existing)).thenReturn(existing);

        var saved = service().upsertVehiclePricing(serviceId,
                new ServiceVehiclePricingRequest("toyota ", " camry", BigDecimal.valueOf(750), 45));

        assertEquals("TOYOTA", saved.brand());
        assertEquals("CAMRY", saved.model());
        assertEquals(BigDecimal.valueOf(750), saved.unitPrice());
        assertEquals(45, saved.durationMinutes());
    }

    private ServiceCatalogServiceImpl service() {
        return new ServiceCatalogServiceImpl(
                serviceRepository, serviceCategoryRepository, serviceBomRepository, partRepository,
                serviceMapper, serviceBomMapper, serviceVehiclePricingRepository);
    }
}
