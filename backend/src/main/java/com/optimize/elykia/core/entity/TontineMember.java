package com.optimize.elykia.core.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class TontineMember extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tontine_session_id", nullable = false)
    @JsonBackReference
    private TontineSession tontineSession;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(columnDefinition = "double precision default 0")
    private Double totalContribution = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(50)", nullable = false)
    private TontineMemberDeliveryStatus deliveryStatus = TontineMemberDeliveryStatus.SESSION_INPROGRESS;

    @Column(nullable = false)
    private LocalDateTime registrationDate;

    @OneToOne(mappedBy = "tontineMember", cascade = CascadeType.ALL)
    @JsonManagedReference
    private TontineDelivery delivery;

    @Enumerated(EnumType.STRING)
    private TontineMemberFrequency frequency;

    private Double amount;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "double precision default 0")
    private Double societyShare = 0.0;

    @Column(columnDefinition = "double precision default 0")
    private Double availableContribution = 0.0;

    @Column(columnDefinition = "integer default 0")
    private Integer validatedMonths = 0;

    @Column(columnDefinition = "integer default 0")
    private Integer currentMonthDays = 0;
}
