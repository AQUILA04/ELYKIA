package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@Setter
@ToString
@Entity
public class Recovery extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;
    private Double amount;
    private LocalDate paymentDate;
    private String paymentMethod = "CASH";
    private String notes;
    private String distributionId;
    private String clientId;
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
    private LocalDate createdAt;
    private LocalDate syncDate;

    private String operationConsentCode;

    @Column(columnDefinition = "double precision default 0")
    private Double confirmedAmount;

    @Column(name = "sync_consent_code")
    private String syncConsentCode;
}
