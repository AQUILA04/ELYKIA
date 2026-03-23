package com.optimize.elykia.core.entity.inventory;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.InventoryStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@Table(name = "inventory")
public class Inventory extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventory_date", nullable = false, updatable = false)
    private LocalDate inventoryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InventoryStatus status = InventoryStatus.DRAFT;

    @Column(name = "created_by", nullable = false, updatable = false)
    private String createdByUser;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "inventory", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @JsonIgnore
    private List<InventoryItem> items = new ArrayList<>();

    public void addItem(InventoryItem item) {
        items.add(item);
        item.setInventory(this);
    }

    public void removeItem(InventoryItem item) {
        items.remove(item);
        item.setInventory(null);
    }
}

