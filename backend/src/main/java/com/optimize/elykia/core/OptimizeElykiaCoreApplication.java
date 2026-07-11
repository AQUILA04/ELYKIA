package com.optimize.elykia.core;

import com.optimize.common.securities.config.DefaultSecurityAuditorAware;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.envers.repository.support.EnversRevisionRepositoryFactoryBean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.scheduling.annotation.EnableScheduling;

@Slf4j
@SpringBootApplication(scanBasePackages = "com.optimize" )
@EntityScan(basePackages = {"com.optimize.elykia", "com.optimize.common.securities"})
@EnableJpaRepositories(basePackages = {"com.optimize.elykia", "com.optimize.common.securities"},repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class)
@ConfigurationPropertiesScan({"com.optimize.elykia.core.config", "com.optimize.elykia.core.ai.config", "com.optimize.elykia.recruitment"})
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class OptimizeElykiaCoreApplication {

    public static void main(String[] args) {

        ConfigurableApplicationContext app = new SpringApplicationBuilder(
                OptimizeElykiaCoreApplication.class)
                .build().run(args);
        Environment env = app.getEnvironment();
        String protocol = "http";
        if (env.getProperty("server.ssl.key-store") != null) {
            protocol = "https";
        }
        log.info(""" 

                        ----------------------------------------------------------
                        | Application '{}' is running! Access URLs:
                        | Local: {}://localhost:{}
                        | Profile(s): {}
                        ----------------------------------------------------------""",
                env.getProperty("spring.application.name"),
                protocol,
                env.getProperty("server.port"),
                env.getActiveProfiles());
    }


    @Bean
    AuditorAware<String> auditorProvider() {
        return new DefaultSecurityAuditorAware();
    }

}
