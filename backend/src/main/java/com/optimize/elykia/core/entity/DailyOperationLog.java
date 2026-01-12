package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.OperationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class DailyOperationLog extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationType type;

    @Column(columnDefinition = "double precision default 0")
    private Double amount;

    private String reference; // e.g., Client name, Invoice ID

    private String description;

    public DailyOperationLog(LocalDate date, String commercialUsername, LocalDateTime timestamp, OperationType type,
            Double amount, String reference, String description) {
        this.date = date;
        this.commercialUsername = commercialUsername;
        this.timestamp = timestamp;
        this.type = type;
        this.amount = amount;
        this.reference = reference;
        this.description = description;
    }
}
