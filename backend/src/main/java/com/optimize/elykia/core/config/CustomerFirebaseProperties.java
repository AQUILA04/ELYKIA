package com.optimize.elykia.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.customer.auth.firebase")
@Getter
@Setter
public class CustomerFirebaseProperties {
    private boolean enabled = false;
    private String credentialsPath;
}
