package com.optimize.elykia.core.entity.bi;

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
@Table(name = "commercial_performance")
public class CommercialPerformance extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "collector")
    private String collector;
    
    @Column(name = "period_start")
    private LocalDate periodStart;
    
    @Column(name = "period_end")
    private LocalDate periodEnd;
    
    // Métriques de vente
    @Column(name = "total_sales_count")
    private Integer totalSalesCount;
    
    @Column(name = "total_sales_amount")
    private Double totalSalesAmount;
    
    @Column(name = "total_profit")
    private Double totalProfit;
    
    @Column(name = "average_sale_amount")
    private Double averageSaleAmount;
    
    // Métriques de recouvrement
    @Column(name = "total_collected")
    private Double totalCollected;
    
    @Column(name = "collection_rate")
    private Double collectionRate; // %
    
    @Column(name = "on_time_payments_count")
    private Integer onTimePaymentsCount;
    
    @Column(name = "late_payments_count")
    private Integer latePaymentsCount;
    
    // Métriques de distribution
    @Column(name = "active_clients_count")
    private Integer activeClientsCount;
    
    @Column(name = "new_clients_count")
    private Integer newClientsCount;
    
    @Column(name = "client_retention_rate")
    private Double clientRetentionRate;
    
    // Métriques de risque
    @Column(name = "portfolio_at_risk")
    private Double portfolioAtRisk; // Montant en retard
    
    @Column(name = "critical_accounts_count")
    private Integer criticalAccountsCount;
}
