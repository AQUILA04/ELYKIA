package com.optimize.elykia.core.entity.sale;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class CreditReturnHistory extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    private Credit credit;
    
    @ManyToOne
    private Articles article;
    
    private Integer returnedQuantity;
    private LocalDate returnDate;
    private String operationUser;
    
    public static CreditReturnHistory createReturnHistory(Credit credit, Articles article, Integer quantity, String username) {
        CreditReturnHistory history = new CreditReturnHistory();
        history.setCredit(credit);
        history.setArticle(article);
        history.setReturnedQuantity(quantity);
        history.setReturnDate(LocalDate.now());
        history.setOperationUser(username);
        return history;
    }
}