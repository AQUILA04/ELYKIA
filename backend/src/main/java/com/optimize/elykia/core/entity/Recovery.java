package com.optimize.elykia.core.entity;

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
    private Double amount;
    private LocalDate paymentDate;
    private String paymentMethod = "CASH";
    private String notes;
    private String distributionId;
    private String clientId;
    private String commercialId;
    private LocalDate createdAt;
    private LocalDate syncDate;

    private String operationConsentCode;

    @Column(columnDefinition = "double precision default 0")
    private Double confirmedAmount;

    @Column(name = "sync_consent_code")
    private String syncConsentCode;
}
