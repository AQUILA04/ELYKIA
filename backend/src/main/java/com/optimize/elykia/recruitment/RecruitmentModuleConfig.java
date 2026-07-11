package com.optimize.elykia.recruitment;

import com.optimize.elykia.recruitment.site.config.RecruitmentSiteProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({RecruitmentProperties.class, RecruitmentSiteProperties.class})
public class RecruitmentModuleConfig {
}
