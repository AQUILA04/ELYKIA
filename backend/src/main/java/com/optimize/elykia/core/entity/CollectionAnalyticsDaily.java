package com.optimize.elykia.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing daily collection analytics aggregations
 * Used for BI performance optimization to prevent OutOfMemoryException
 */
@Entity
@Table(name = "collection_analytics_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"collection_date", "collector"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionAnalyticsDaily {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "collection_date", nullable = false)
    private LocalDate collectionDate;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "payment_count", nullable = false)
    private Integer paymentCount = 0;
    
    @Column(name = "total_collected", nullable = false)
    private Double totalCollected = 0.0;
    
    @Column(name = "avg_payment", nullable = false)
    private Double avgPayment = 0.0;
    
    @Column(name = "on_time_count", nullable = false)
    private Integer onTimeCount = 0;
    
    @Column(name = "late_count", nullable = false)
    private Integer lateCount = 0;
    
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