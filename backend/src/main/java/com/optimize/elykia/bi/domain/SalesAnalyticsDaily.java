package com.optimize.elykia.bi.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing daily sales analytics aggregations
 * Used for BI performance optimization to prevent OutOfMemoryException
 */
@Entity
@Table(name = "sales_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"sale_date", "collector", "client_type"}))
@Getter
@Setter
@NoArgsConstructor
public class SalesAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate = LocalDate.now();
    
    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    @Column(name = "collector")
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }
    
    @Column(name = "client_type", length = 50)
    private String clientType;
    
    @Column(name = "sales_count", nullable = false)
    private Integer salesCount = 0;
    
    @Column(name = "total_sales", nullable = false)
    private Double totalSales = 0.0;
    
    @Column(name = "total_cost", nullable = false)
    private Double totalCost = 0.0;
    
    @Column(name = "total_profit", nullable = false)
    private Double totalProfit = 0.0;
    
    @Column(name = "avg_sale_amount", nullable = false)
    private Double avgSaleAmount = 0.0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "settled_count", nullable = false)
    private Integer settledCount = 0;
    
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