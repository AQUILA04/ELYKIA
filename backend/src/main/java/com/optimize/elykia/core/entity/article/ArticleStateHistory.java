package com.optimize.elykia.core.entity.article;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.common.entities.enums.State;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class ArticleStateHistory extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private Articles article;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State previousState;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State newState;

    public ArticleStateHistory(Articles article, State previousState, State newState) {
        this.article = article;
        this.previousState = previousState;
        this.newState = newState;
    }
}
