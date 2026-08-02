package com.optimize.elykia.core.entity.tontine;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tontine_member_field_control")
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
public class TontineMemberFieldControl extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tontine_member_id", nullable = false)
    private TontineMember tontineMember;

    /** Client-supplied idempotency key (unique). */
    @Column(name = "reference", nullable = false, length = 64, unique = true)
    private String reference;

    @Column(name = "notebook_total_amount", nullable = false)
    private Double notebookTotalAmount;

    @Column(name = "system_total_amount", nullable = false)
    private Double systemTotalAmount;

    @Column(name = "difference_amount", nullable = false)
    private Double differenceAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FieldControlStatus status;

    @Column(name = "observed_at", nullable = false)
    private LocalDateTime observedAt;

    @Column(name = "observed_by", nullable = false)
    private String observedBy;

    @Column(name = "note", length = 1000)
    private String note;

    @OneToMany(mappedBy = "fieldControl", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("year ASC, month ASC")
    private List<TontineMemberFieldControlLine> lines = new ArrayList<>();

    public void addLine(TontineMemberFieldControlLine line) {
        line.setFieldControl(this);
        this.lines.add(line);
    }
}
