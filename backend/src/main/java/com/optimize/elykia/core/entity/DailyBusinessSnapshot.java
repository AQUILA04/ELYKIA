package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@Table(name = "daily_business_snapshot")
public class DailyBusinessSnapshot extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "snapshot_date", unique = true)
    private LocalDate snapshotDate;
    
    // Ventes
    @Column(name = "new_credits_count")
    private Integer newCreditsCount;
    
    @Column(name = "new_credits_total_amount")
    private Double newCreditsTotalAmount;
    
    @Column(name = "new_credits_profit")
    private Double newCreditsProfit;
    
    // Collections
    @Column(name = "daily_collections")
    private Double dailyCollections;
    
    @Column(name = "payments_received_count")
    private Integer paymentsReceivedCount;
    
    // Stock
    @Column(name = "total_stock_value")
    private Double totalStockValue;
    
    @Column(name = "low_stock_items_count")
    private Integer lowStockItemsCount;
    
    @Column(name = "out_of_stock_items_count")
    private Integer outOfStockItemsCount;
    
    // Portefeuille
    @Column(name = "total_outstanding_amount")
    private Double totalOutstandingAmount;
    
    @Column(name = "total_overdue_amount")
    private Double totalOverdueAmount;
    
    @Column(name = "active_credits_count")
    private Integer activeCreditsCount;
    
    // Trésorerie
    @Column(name = "cash_in_hand")
    private Double cashInHand;
    
    @Column(name = "expected_daily_collection")
    private Double expectedDailyCollection;
}
