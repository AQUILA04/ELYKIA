package com.optimize.elykia.client.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "minio")
@Getter
@Setter
public class MinioProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucket = "elykia-clients";
    private String reportsBucket = "elykia-reports";
    private String mobileReleasesBucket = "elykia-mobile-releases";
    private String customerSpaceReleasesBucket = "elykia-customer-space-releases";
    private String publicUrl;
    /** Canal de release mobile (ex. test, prod) — préfixe des objets manifest/APK dans MinIO. */
    private String mobileReleaseChannel = "prod";
    /** Canal de release espace client (ex. test, prod). */
    private String customerSpaceReleaseChannel = "prod";
}
