package com.optimize.elykia.client.entity;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "client_collector_history")
@Getter
@Setter
public class ClientCollectorHistory extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "collector_type", nullable = false)
    private ClientCollectorType collectorType;

    @Column(name = "old_collector")
    private String oldCollector;

    @Column(name = "new_collector", nullable = false)
    private String newCollector;

    @Column(name = "old_commercial_username")
    private String oldCommercialUsername;

    @Column(name = "new_commercial_username")
    private String newCommercialUsername;

    public void setOldCommercialUsername(String oldCommercialUsername) {
        this.oldCommercialUsername = oldCommercialUsername;
        this.oldCollector = oldCommercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setOldCollector(String oldCollector) {
        this.oldCollector = oldCollector;
        this.oldCommercialUsername = oldCollector;
    }

    public String getOldCommercialUsername() {
        return oldCommercialUsername != null ? oldCommercialUsername : oldCollector;
    }

    public void setNewCommercialUsername(String newCommercialUsername) {
        this.newCommercialUsername = newCommercialUsername;
        this.newCollector = newCommercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setNewCollector(String newCollector) {
        this.newCollector = newCollector;
        this.newCommercialUsername = newCollector;
    }

    public String getNewCommercialUsername() {
        return newCommercialUsername != null ? newCommercialUsername : newCollector;
    }

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;
}
