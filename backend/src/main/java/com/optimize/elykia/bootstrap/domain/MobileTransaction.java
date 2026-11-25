package com.optimize.elykia.bootstrap.domain;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@Setter
@ToString
@Entity
public class MobileTransaction extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;
    private String clientId;
    private String referenceId;
    private String type;
    private Double amount;
    private String details;
    private LocalDate date;
    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String commercialId;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.commercialId = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCommercialId(String commercialId) {
        this.commercialId = commercialId;
        this.commercialUsername = commercialId;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : commercialId;
    }
}
