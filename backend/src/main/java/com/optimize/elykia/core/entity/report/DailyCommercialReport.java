package com.optimize.elykia.core.entity.report;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class DailyCommercialReport extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String commercialUsername;

    // Stock Request (Vente à Crédit)
    @Column(columnDefinition = "double precision default 0")
    private Double totalStockRequestAmount = 0.0;

    // Stock Tontine Request (NOUVEAU)
    @Column(columnDefinition = "double precision default 0")
    private Double totalTontineStockRequestAmount = 0.0;

    // Credit Sales
    @Column(columnDefinition = "integer default 0")
    private Integer creditSalesCount = 0;

    @Column(columnDefinition = "double precision default 0")
    private Double creditSalesAmount = 0.0;

    // Client Creation
    @Column(columnDefinition = "integer default 0")
    private Integer newClientsCount = 0;

    // Account Creation (Initial Balance)
    @Column(columnDefinition = "double precision default 0")
    private Double newAccountsBalance = 0.0;

    // Credit Collections
    @Column(columnDefinition = "integer default 0")
    private Integer collectionsCount = 0;

    @Column(columnDefinition = "double precision default 0")
    private Double collectionsAmount = 0.0;

    // Orders
    @Column(columnDefinition = "integer default 0")
    private Integer ordersCount = 0;

    @Column(columnDefinition = "double precision default 0")
    private Double ordersAmount = 0.0;

    // Tontine Members
    @Column(columnDefinition = "integer default 0")
    private Integer tontineMembersCount = 0;

    // Tontine Collections
    @Column(columnDefinition = "integer default 0")
    private Integer tontineCollectionsCount = 0;

    @Column(columnDefinition = "double precision default 0")
    private Double tontineCollectionsAmount = 0.0;

    // Tontine Deliveries
    @Column(columnDefinition = "integer default 0")
    private Integer tontineDeliveriesCount = 0;

    @Column(columnDefinition = "double precision default 0")
    private Double tontineDeliveriesAmount = 0.0;

    // Cash Management
    @Column(columnDefinition = "double precision default 0")
        private Double totalAmountToDeposit = 0.0; // Recettes total (Cash-in)

    @Column(columnDefinition = "double precision default 0")
    private Double totalAmountDeposited = 0.0; // Somme des versements effectués

    // Marges
    @Column(columnDefinition = "double precision default 0")
    private Double creditSalesMargin = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double stockRequestMargin = 0.0;

    // Advances
    @Column(columnDefinition = "double precision default 0")
    private Double totalAdvancesAmount = 0.0;

    public DailyCommercialReport(String commercialUsername, Double totalStockRequestAmount, Long creditSalesCount,
            Double creditSalesAmount, Long newClientsCount, Double newAccountsBalance, Long collectionsCount,
            Double collectionsAmount, Long ordersCount, Double ordersAmount, Long tontineMembersCount,
            Long tontineCollectionsCount, Double tontineCollectionsAmount, Long tontineDeliveriesCount,
            Double tontineDeliveriesAmount, Double totalAmountToDeposit, Double totalAmountDeposited,
            Double creditSalesMargin, Double stockRequestMargin, Double totalAdvancesAmount) {
        this.commercialUsername = commercialUsername;
        this.totalStockRequestAmount = totalStockRequestAmount != null ? totalStockRequestAmount : 0.0;
        this.creditSalesCount = creditSalesCount != null ? creditSalesCount.intValue() : 0;
        this.creditSalesAmount = creditSalesAmount != null ? creditSalesAmount : 0.0;
        this.newClientsCount = newClientsCount != null ? newClientsCount.intValue() : 0;
        this.newAccountsBalance = newAccountsBalance != null ? newAccountsBalance : 0.0;
        this.collectionsCount = collectionsCount != null ? collectionsCount.intValue() : 0;
        this.collectionsAmount = collectionsAmount != null ? collectionsAmount : 0.0;
        this.ordersCount = ordersCount != null ? ordersCount.intValue() : 0;
        this.ordersAmount = ordersAmount != null ? ordersAmount : 0.0;
        this.tontineMembersCount = tontineMembersCount != null ? tontineMembersCount.intValue() : 0;
        this.tontineCollectionsCount = tontineCollectionsCount != null ? tontineCollectionsCount.intValue() : 0;
        this.tontineCollectionsAmount = tontineCollectionsAmount != null ? tontineCollectionsAmount : 0.0;
        this.tontineDeliveriesCount = tontineDeliveriesCount != null ? tontineDeliveriesCount.intValue() : 0;
        this.tontineDeliveriesAmount = tontineDeliveriesAmount != null ? tontineDeliveriesAmount : 0.0;
        this.totalAmountToDeposit = totalAmountToDeposit != null ? totalAmountToDeposit : 0.0;
        this.totalAmountDeposited = totalAmountDeposited != null ? totalAmountDeposited : 0.0;
        this.creditSalesMargin = creditSalesMargin != null ? creditSalesMargin : 0.0;
        this.stockRequestMargin = stockRequestMargin != null ? stockRequestMargin : 0.0;
        this.totalAdvancesAmount = totalAdvancesAmount != null ? totalAdvancesAmount : 0.0;
    }

    public void addAmountToDeposit(Double amount) {
        if (Objects.nonNull(amount)) {
            this.totalAmountToDeposit += amount;
        }

    }
}
