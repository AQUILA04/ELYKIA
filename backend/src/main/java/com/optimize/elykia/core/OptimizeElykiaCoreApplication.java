package com.optimize.elykia.core;

import com.optimize.common.securities.config.DefaultSecurityAuditorAware;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.envers.repository.support.EnversRevisionRepositoryFactoryBean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.optimize" )
@EnableJpaRepositories(basePackages = {"com.optimize.elykia", "com.optimize.common.securities"},repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class)
@ConfigurationPropertiesScan({"com.optimize.elykia.core.config"})
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
@EnableScheduling
public class OptimizeElykiaCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(OptimizeElykiaCoreApplication.class, args);
	}

    @Bean
    AuditorAware<String> auditorProvider() {
        return new DefaultSecurityAuditorAware();
    }

}
