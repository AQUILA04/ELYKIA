package com.optimize.common.securities.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app.security.parameter")
@Getter
@Setter
public class ParameterProperties {
    private boolean initEnabled;
    private List<ParameterData> initData = new ArrayList<>();

    @Getter
    @Setter
    public static class ParameterData {
        private String key;
        private String value;
        private String description;
    }
}
