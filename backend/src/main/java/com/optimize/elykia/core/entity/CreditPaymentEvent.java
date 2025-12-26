package com.optimize.elykia.core.entity;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@Table(name = "credit_payment_event")
public class CreditPaymentEvent extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "credit_id")
    private Credit credit;
    
    @Column(name = "payment_date")
    private LocalDateTime paymentDate;
    
    @Column(name = "amount")
    private Double amount;
    
    @Column(name = "days_from_last_payment")
    private Integer daysFromLastPayment;
    
    @Column(name = "is_on_time")
    private Boolean isOnTime; // Paiement dans les délais
    
    @Column(name = "payment_method")
    private String paymentMethod; // CASH, MOBILE_MONEY, etc.
}
