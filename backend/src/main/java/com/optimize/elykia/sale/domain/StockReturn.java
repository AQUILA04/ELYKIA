package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.domain.CommercialStockReturn} (activité {@code CREDIT}).
 */
@Deprecated(since = "2.16.0", forRemoval = true)
@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockReturn extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    private String reference;

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

    @ManyToOne
    private CommercialMonthlyStock targetStock;

    private String note;

    private LocalDate returnDate;
    private LocalDate receivedDate;
    private LocalDate targetStockDate;

    @Enumerated(EnumType.STRING)
    private StockReturnStatus status = StockReturnStatus.CREATED;

    @OneToMany(mappedBy = "stockReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<StockReturnItem> items = new HashSet<>();

    public void addItem(StockReturnItem item) {
        items.add(item);
        item.setStockReturn(this);
    }
}
