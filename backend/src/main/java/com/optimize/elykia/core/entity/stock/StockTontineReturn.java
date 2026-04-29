package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
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

    private String collector; // Le commercial

    private LocalDate returnDate;

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
