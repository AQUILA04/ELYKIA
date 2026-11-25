package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.sale.web.dto.StockRecoverySummaryDto;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.domain.CommercialStockPosition} (activité {@code CREDIT}).
 */
@Deprecated(since = "2.16.0", forRemoval = true)
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(uniqueConstraints = {
    @UniqueConstraint(columnNames = {"collector", "month", "year"})
})
public class CommercialMonthlyStock extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }

    private Integer month;

    private Integer year;

    @Enumerated(EnumType.STRING)
    private StockStatus status = StockStatus.ACTIVE;

    @OneToMany(mappedBy = "monthlyStock", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CommercialMonthlyStockItem> items = new HashSet<>();

    @Transient
    private StockRecoverySummaryDto recoverySummary;

    public void addItem(CommercialMonthlyStockItem item) {
        items.add(item);
        item.setMonthlyStock(this);
    }
}
