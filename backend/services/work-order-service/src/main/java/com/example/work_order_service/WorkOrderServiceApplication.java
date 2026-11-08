package com.example.work_order_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.example.work_order_service.integration")
public class WorkOrderServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(WorkOrderServiceApplication.class, args);
	}

}
