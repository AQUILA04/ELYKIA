package com.optimize.elykia.core.entity.sale;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Embeddable
@Getter
@Setter
public class CreditDistributionViewId implements Serializable {

    @Column(name = "credit_parent_id")
    private Long creditParentId;

    @Column(name = "article_id")
    private Long articleId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CreditDistributionViewId that = (CreditDistributionViewId) o;
        return Objects.equals(creditParentId, that.creditParentId) &&
               Objects.equals(articleId, that.articleId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(creditParentId, articleId);
    }
}
