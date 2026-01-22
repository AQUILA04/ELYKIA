package com.optimize.elykia.client.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "optimize.client.auto-init")
@Getter
@Setter
public class ClientAutoInitProperties {
    private boolean enabled = true;
}
