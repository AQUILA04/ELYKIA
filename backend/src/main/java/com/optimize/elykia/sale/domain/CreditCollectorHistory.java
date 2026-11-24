package com.optimize.elykia.sale.domain;

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

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "total_amount_paid")
    private Double totalAmountPaid;

    @Column(name = "total_amount_remaining")
    private Double totalAmountRemaining;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;

}
