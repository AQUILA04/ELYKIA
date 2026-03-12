package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.Auditable;
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
public class    StockReception extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String reference;

    private LocalDate receptionDate;

    private String receivedBy;

    @Column(columnDefinition = "double precision default 0")
    private Double totalAmount;

    @OneToMany(mappedBy = "stockReception", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<StockReceptionItem> items = new HashSet<>();

    public void addItem(StockReceptionItem item) {
        items.add(item);
        item.setStockReception(this);
    }

    public void removeItem(StockReceptionItem item) {
        items.remove(item);
        item.setStockReception(null);
    }
}
