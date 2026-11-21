package com.optimize.common.securities.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties(prefix = "security.config")
@Getter
@Setter
public class ProfileProperties {
    private AutoInit autoInitialize;
    private String profiles;
    private String permissions;
    private Map<String, String> profilPermissions = new HashMap<>();
    private Users users;


    @Getter
    public static class Users {
        Map<String, Object> accounts = new HashMap<>();
    }

    @Getter
    @Setter
    public static class AutoInit {
        private boolean enabled;
    }
}
