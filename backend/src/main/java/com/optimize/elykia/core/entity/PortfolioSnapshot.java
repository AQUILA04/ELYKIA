package com.optimize.elykia.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing portfolio state snapshots for historical tracking
 * Used for BI performance optimization to prevent OutOfMemoryException
 */
@Entity
@Table(name = "portfolio_snapshot")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSnapshot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "snapshot_date", nullable = false, unique = true)
    private LocalDate snapshotDate;
    
    @Column(name = "active_credits_count", nullable = false)
    private Integer activeCreditsCount = 0;
    
    @Column(name = "total_outstanding", nullable = false)
    private Double totalOutstanding = 0.0;
    
    @Column(name = "total_overdue", nullable = false)
    private Double totalOverdue = 0.0;
    
    @Column(name = "par_7", nullable = false)
    private Double par7 = 0.0;
    
    @Column(name = "par_15", nullable = false)
    private Double par15 = 0.0;
    
    @Column(name = "par_30", nullable = false)
    private Double par30 = 0.0;
    
    @Column(name = "avg_credit_duration")
    private Double avgCreditDuration;
    
    @Column(name = "early_payers_count", nullable = false)
    private Integer earlyPayersCount = 0;
    
    @Column(name = "on_time_payers_count", nullable = false)
    private Integer onTimePayersCount = 0;
    
    @Column(name = "late_payers_count", nullable = false)
    private Integer latePayersCount = 0;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}