package com.optimize.common.securities.config;

import com.optimize.common.entities.config.CustomMessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityMessageSource {

    @Bean
    public CustomMessageSource customMessageSource() {
        return new CustomMessageSource();
    }
}
