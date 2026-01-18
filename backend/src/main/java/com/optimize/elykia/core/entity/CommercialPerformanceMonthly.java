package com.optimize.elykia.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity representing monthly commercial performance metrics
 * Used for BI performance optimization to prevent OutOfMemoryException
 */
@Entity
@Table(name = "commercial_performance_monthly",
       uniqueConstraints = @UniqueConstraint(columnNames = {"collector", "year", "month"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommercialPerformanceMonthly {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "collector", nullable = false)
    private String collector;
    
    @Column(name = "year", nullable = false)
    private Integer year;
    
    @Column(name = "month", nullable = false)
    private Integer month;
    
    @Column(name = "total_sales_count", nullable = false)
    private Integer totalSalesCount = 0;
    
    @Column(name = "total_sales_amount", nullable = false)
    private Double totalSalesAmount = 0.0;
    
    @Column(name = "total_profit", nullable = false)
    private Double totalProfit = 0.0;
    
    @Column(name = "avg_sale_amount", nullable = false)
    private Double avgSaleAmount = 0.0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "collection_rate", nullable = false)
    private Double collectionRate = 0.0;
    
    @Column(name = "active_clients_count", nullable = false)
    private Integer activeClientsCount = 0;
    
    @Column(name = "new_clients_count", nullable = false)
    private Integer newClientsCount = 0;
    
    @Column(name = "late_credits_count", nullable = false)
    private Integer lateCreditsCount = 0;
    
    @Column(name = "portfolio_at_risk", nullable = false)
    private Double portfolioAtRisk = 0.0;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}