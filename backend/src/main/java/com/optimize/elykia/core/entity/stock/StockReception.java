package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import com.optimize.elykia.core.enumaration.ReceptionStatus;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class    StockReception extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReceptionStatus status = ReceptionStatus.PENDING;

    @Column(unique = true)
    private String reference;

    private LocalDate receptionDate;

    private String receivedBy;

    @Column(columnDefinition = "double precision default 0")
    private Double totalAmount;

    private String validatedBy;

    private LocalDateTime validatedAt;

    private String refusedBy;

    private LocalDateTime refusedAt;

    private String refusalReason;

    private String cancelledBy;

    private LocalDateTime cancelledAt;

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
