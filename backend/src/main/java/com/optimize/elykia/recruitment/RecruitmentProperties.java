package com.optimize.elykia.recruitment;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "elykia.recruitment")
@Getter
@Setter
public class RecruitmentProperties {

    private String bucket = "elykia-recruitment";
    private long maxCvBytes = 5L * 1024 * 1024;
    private long maxOfferImageBytes = 2L * 1024 * 1024;
    private int maxApplicationsPerIpPerHour = 5;
}
