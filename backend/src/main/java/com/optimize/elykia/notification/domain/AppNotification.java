package com.optimize.elykia.notification.domain;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.notification.api.AppNotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_notification")
@Getter
@Setter
@NoArgsConstructor
public class AppNotification extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AppNotificationType type;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "entity_reference")
    private String entityReference;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "client_name")
    private String clientName;

    /** @deprecated Utiliser {@link #targetCommercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    @Column(name = "target_collector")
    private String targetCollector;

    @Column(name = "target_commercial_username")
    private String targetCommercialUsername;

    /** @deprecated Utiliser {@link #tontineCommercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    @Column(name = "tontine_collector")
    private String tontineCollector;

    @Column(name = "tontine_commercial_username")
    private String tontineCommercialUsername;

    public void setTargetCommercialUsername(String targetCommercialUsername) {
        this.targetCommercialUsername = targetCommercialUsername;
        this.targetCollector = targetCommercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setTargetCollector(String targetCollector) {
        this.targetCollector = targetCollector;
        this.targetCommercialUsername = targetCollector;
    }

    public String getTargetCommercialUsername() {
        return targetCommercialUsername != null ? targetCommercialUsername : targetCollector;
    }

    public void setTontineCommercialUsername(String tontineCommercialUsername) {
        this.tontineCommercialUsername = tontineCommercialUsername;
        this.tontineCollector = tontineCommercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setTontineCollector(String tontineCollector) {
        this.tontineCollector = tontineCollector;
        this.tontineCommercialUsername = tontineCollector;
    }

    public String getTontineCommercialUsername() {
        return tontineCommercialUsername != null ? tontineCommercialUsername : tontineCollector;
    }

    @Column(name = "operation_date")
    private LocalDate operationDate;

    private Double amount;

    @Column(name = "link_path", length = 512)
    private String linkPath;

    @Column(name = "link_query", length = 1024)
    private String linkQuery;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
