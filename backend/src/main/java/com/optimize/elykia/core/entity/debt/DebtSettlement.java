package com.optimize.elykia.core.entity.debt;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.DebtSettlementMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "debt_settlement")
@Getter
@Setter
@NoArgsConstructor
public class DebtSettlement extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_mode", nullable = false, length = 30)
    private DebtSettlementMode settlementMode;

    @Column(nullable = false)
    private Double amount = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "surplus_debt_id")
    @JsonIgnore
    private DebtDocument surplusDebt;

    @Column(length = 1000)
    private String note;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;

    @OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DebtAllocation> allocations = new ArrayList<>();

    public void addAllocation(DebtAllocation allocation) {
        allocations.add(allocation);
        allocation.setSettlement(this);
    }
}
