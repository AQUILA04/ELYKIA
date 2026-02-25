package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import com.optimize.common.entities.entity.BaseEntity;

@Entity
@Table(name = "credit_collector_history")
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
public class CreditCollectorHistory extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id", nullable = false)
    @JsonIgnore
    private Credit credit;

    @Column(name = "old_collector", nullable = false)
    private String oldCollector;

    @Column(name = "new_collector", nullable = false)
    private String newCollector;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "total_amount_paid")
    private Double totalAmountPaid;

    @Column(name = "total_amount_remaining")
    private Double totalAmountRemaining;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;

}
