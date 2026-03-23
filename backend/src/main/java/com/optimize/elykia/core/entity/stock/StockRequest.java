package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
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
public class StockRequest extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String reference;

    private String collector; // Le commercial

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

    public void addItem(StockRequestItem item) {
        items.add(item);
        item.setStockRequest(this);
    }

    public void removeItem(StockRequestItem item) {
        items.remove(item);
        item.setStockRequest(null);
    }
}
