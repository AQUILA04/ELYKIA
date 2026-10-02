package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.ActiveStockRequestInfo;
import com.optimize.elykia.core.enumaration.OrderSource;
import com.optimize.elykia.core.enumaration.OrderStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "orders") // Using "orders" as "order" is a reserved keyword in SQL
@Getter
@Setter
@NoArgsConstructor
public class Order extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false)
    private LocalDateTime orderDate;

    @Column(nullable = false)
    private Double totalAmount;

    @Column(nullable = false)
    private Double totalPurchasePrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderSource source = OrderSource.STAFF;

    @Column(name = "operation_consent_code")
    private String operationConsentCode;

    @Column(columnDefinition = "double precision default 0")
    private Double confirmedAmount;

    @Column(name = "sync_consent_code")
    private String syncConsentCode;

    @JsonManagedReference
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<OrderItem> items;

    /** Demande de stock active liée (CREATED / VALIDATED / DELIVERED), remplie en service. */
    @Transient
    private ActiveStockRequestInfo activeStockRequest;
}
