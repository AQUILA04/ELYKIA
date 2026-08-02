package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "tontine_member_field_control_line")
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
public class TontineMemberFieldControlLine extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_control_id", nullable = false)
    private TontineMemberFieldControl fieldControl;

    @Column(name = "year", nullable = false)
    private Integer year;

    /** Mois calendaire 1–12 (février = 2 … novembre = 11 pour la session tontine). */
    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "notebook_amount", nullable = false)
    private Double notebookAmount;

    @Column(name = "system_amount", nullable = false)
    private Double systemAmount;

    @Column(name = "difference_amount", nullable = false)
    private Double differenceAmount;
}
