package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

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

    private String collector; // Le commercial

    private Integer month;

    private Integer year;

    @OneToMany(mappedBy = "monthlyStock", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CommercialMonthlyStockItem> items = new HashSet<>();
    
    public void addItem(CommercialMonthlyStockItem item) {
        items.add(item);
        item.setMonthlyStock(this);
    }
}
