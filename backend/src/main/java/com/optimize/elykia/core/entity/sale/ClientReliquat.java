package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.client.entity.Client;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "client_reliquats")
public class ClientReliquat extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false, unique = true)
    @JsonIgnore
    private Client client;

    @Column(nullable = false, columnDefinition = "double precision default 0")
    private Double totalAmount = 0.0;

    @Column(name = "last_recovery_id")
    private String lastRecoveryId;

    @Column(name = "last_accounted_date")
    private LocalDate lastAccountedDate;

    public ClientReliquat(Client client, Double totalAmount) {
        this.client = client;
        this.totalAmount = totalAmount;
    }
}
