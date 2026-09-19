package com.optimize.elykia.core.entity.agency;

import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Links a user ({@code USERS.USEID}) to an agency for a period.
 * Active assignment: {@code endDate == null}.
 */
@Entity
@Table(name = "agency_assignment", indexes = {
        @Index(name = "idx_aa_user_end", columnList = "user_id, end_date"),
        @Index(name = "idx_aa_agency_active", columnList = "agency_id, end_date")
})
@Getter
@Setter
@NoArgsConstructor
public class AgencyAssignment extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** USERS.USEID — not UACC.ACCID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private Agency agency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "assigned_by", nullable = false)
    private String assignedBy;

    @Column(name = "notes")
    private String notes;

    public boolean isActive() {
        return this.endDate == null;
    }
}
