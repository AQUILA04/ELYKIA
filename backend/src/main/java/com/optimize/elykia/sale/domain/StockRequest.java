package com.optimize.elykia.sale.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class StockRequest extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
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

    private String note;

    private Integer month;

    private Integer year;

    private LocalDate requestDate;
    
    private LocalDate validationDate;
    
    private LocalDate deliveryDate;

    private LocalDate accountingDate;

    @Column(columnDefinition = "double precision default 0")
    private Double totalCreditSalePrice;

    @Column(columnDefinition = "double precision default 0")
    private Double totalPurchasePrice;

    @Enumerated(EnumType.STRING)
    private StockRequestStatus status = StockRequestStatus.CREATED;

    @OneToMany(mappedBy = "stockRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<StockRequestItem> items = new HashSet<>();

    /** Vente comptant servie par cette sortie. Vide pour une dotation de sac commercial. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id", unique = true)
    @JsonIgnore
    private Credit credit;

    /** Référence CSH affichée sur la liste, remplie en service. */
    @Transient
    private String cashSaleReference;

    /** Références CMD-x des commandes liées, remplies en service. */
    @Transient
    private List<String> linkedOrderReferences;

    public void addItem(StockRequestItem item) {
        items.add(item);
        item.setStockRequest(this);
    }

    public void removeItem(StockRequestItem item) {
        items.remove(item);
        item.setStockRequest(null);
    }
}
