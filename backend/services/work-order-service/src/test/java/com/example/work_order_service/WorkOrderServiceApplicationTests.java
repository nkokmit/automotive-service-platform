package com.example.work_order_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:work-order-test;DB_CLOSE_DELAY=-1",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.flyway.enabled=false",
		"eureka.client.enabled=false",
		"jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
})
class WorkOrderServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
