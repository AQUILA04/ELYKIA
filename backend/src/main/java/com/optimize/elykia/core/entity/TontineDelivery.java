package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "tontine_delivery")
public class TontineDelivery extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "tontine_member_id", nullable = false, unique = true)
    @JsonBackReference
    private TontineMember tontineMember;
    
    @Column(name = "delivery_date", nullable = false)
    private LocalDateTime deliveryDate;

    @Column(name = "request_date")
    private LocalDateTime requestDate;
    
    @Column(name = "total_amount", nullable = false, columnDefinition = "double precision default 0")
    private Double totalAmount;
    
    @Column(name = "remaining_balance", nullable = false, columnDefinition = "double precision default 0")
    private Double remainingBalance;
    
    @Column(name = "commercial_username", nullable = false)
    private String commercialUsername;
    
    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TontineDeliveryItem> items = new ArrayList<>();
    
    public void addItem(TontineDeliveryItem item) {
        items.add(item);
        item.setDelivery(this);
    }
    
    public void removeItem(TontineDeliveryItem item) {
        items.remove(item);
        item.setDelivery(null);
    }
}
