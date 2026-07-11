package com.optimize.elykia.recruitment.site.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "elykia.recruitment.site")
@Getter
@Setter
public class RecruitmentSiteProperties {
    private int maxApplicationsPerIpPerHour = 5;
}
