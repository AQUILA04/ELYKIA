package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "recovery_manager_operation")
@Getter
@Setter
@NoArgsConstructor
public class RecoveryManagerOperation extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recoveryManagerUsername;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private Long creditId;

    private Long creditTimelineId;

    @Column(nullable = false)
    private Double amountCollected;

    @Column(nullable = false)
    private Boolean isPartial = false;

    @Column(nullable = false)
    private Double originalAmountRemaining;

    @Column(nullable = false)
    private LocalDate operationDate;

    @Column(unique = true, nullable = false)
    private String reference;

    private String clientName;
    private String creditReference;
}
