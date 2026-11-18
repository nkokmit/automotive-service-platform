package com.example.billing_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"DB_URL=jdbc:h2:mem:billing;MODE=MySQL;DB_CLOSE_DELAY=-1",
		"DB_USERNAME=sa",
		"DB_PASSWORD=",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"JWT_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.flyway.enabled=false"
})
class BillingServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
