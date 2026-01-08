package com.optimize.elykia.core.entity;

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
public class StockReturn extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String collector; // Le commercial

    private LocalDate returnDate;

    @Enumerated(EnumType.STRING)
    private StockReturnStatus status = StockReturnStatus.CREATED;

    @OneToMany(mappedBy = "stockReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<StockReturnItem> items = new HashSet<>();

    public void addItem(StockReturnItem item) {
        items.add(item);
        item.setStockReturn(this);
    }
}
