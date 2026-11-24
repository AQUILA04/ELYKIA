package com.optimize.elykia.tontine.domain;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.sale.domain.StockReturnStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockTontineReturn extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    private LocalDate returnDate;
    private LocalDate receivedDate;
    private String receivedBy;
    private LocalDate canceledDate;
    private String canceledBy;

    private String comment;

    @Enumerated(EnumType.STRING)
    private StockReturnStatus status = StockReturnStatus.CREATED;

    @OneToMany(mappedBy = "stockTontineReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<StockTontineReturnItem> items = new HashSet<>();

    public void addItem(StockTontineReturnItem item) {
        items.add(item);
        item.setStockTontineReturn(this);
    }
}
