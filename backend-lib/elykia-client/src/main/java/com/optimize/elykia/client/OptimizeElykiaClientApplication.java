package com.optimize.elykia.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackages = "com.optimize.elykia.client.config")
public class OptimizeElykiaClientApplication {

	public static void main(String[] args) {
		SpringApplication.run(OptimizeElykiaClientApplication.class, args);
	}

}
