package com.optimize.elykia.client.entity;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.client.enumeration.BusinessCreditAuthorizationAction;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_credit_authorization_event")
@Getter
@Setter
public class BusinessCreditAuthorizationEvent extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BusinessCreditAuthorizationAction action;

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;
}
