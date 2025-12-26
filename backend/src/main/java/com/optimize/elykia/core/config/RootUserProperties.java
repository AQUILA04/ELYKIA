package com.optimize.elykia.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.users.root")
public class RootUserProperties {
    private String lastname;
    private String firstname;
    private String email;
    private String phone;
    private String gender;
}
