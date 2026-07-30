package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "credit_field_control")
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
public class CreditFieldControl extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id", nullable = false)
    private Credit credit;

    @Column(name = "notebook_total_amount", nullable = false)
    private Double notebookTotalAmount;

    @Column(name = "system_total_amount_paid", nullable = false)
    private Double systemTotalAmountPaid;

    @Column(name = "difference_amount", nullable = false)
    private Double differenceAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FieldControlStatus status;

    @Column(name = "observed_at", nullable = false)
    private LocalDateTime observedAt;

    @Column(name = "observed_by", nullable = false)
    private String observedBy;

    @Column(name = "note", length = 1000)
    private String note;
}
