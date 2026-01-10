package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.StockValuesDto;
import com.optimize.elykia.core.entity.Articles;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;


public interface ArticlesRepository extends GenericRepository<Articles, Long> {

    Page<Articles> findByStockQuantityEquals(Integer stockQuantity, Pageable pageable);

    Page<Articles> findByStockQuantityLessThanEqualAndStockQuantityGreaterThan(Integer stockQuantity, Integer zeroValue, Pageable pageable);

    Optional<Articles> findByName(String name);

    default Page<Articles> elasticsearch(String keyword, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword), pageable);
    }
    @Modifying
    @Query("UPDATE Articles a SET a.stockQuantity = 0")
    void resetAllStockQuantities();

    default Specification<Articles> getElasticsearchCriteria(String keyword) {
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());
        //final String searchKeyword = StringUtils.isAlpha(keyword) ? String.format("%%%s%%", keyword.toLowerCase()) :  keyword;

        return (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate p = cb.or(
                    //cb.like(cb.lower(from(root, "household.hin")), searchKeyword),
                    cb.like(cb.lower(root.get("marque")), searchKeyword),
                    cb.like(cb.lower(root.get("name")), searchKeyword),
                    cb.like(cb.lower(root.get("model")), searchKeyword),
                    cb.like(cb.lower(root.get("type").as(String.class)), searchKeyword)
            );
            if (StringUtils.isNumeric(searchKeyword)) {
                cb.or(p, cb.equal(root.get("purchasePrice"), Double.valueOf(searchKeyword)));
                cb.or(p, cb.equal(root.get("sellingPrice"), Double.valueOf(searchKeyword)));
                cb.or(p, cb.equal(root.get("creditSalePrice"), Double.valueOf(searchKeyword)));
            }
            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };

    }
    @Query("""
       SELECT new com.optimize.elykia.core.dto.StockValuesDto(
              SUM(a.purchasePrice * a.stockQuantity),
              SUM(a.creditSalePrice * a.stockQuantity)
       )
       FROM Articles a
       """)
    // Le type de retour n'est plus Object[], mais directement notre DTO
    StockValuesDto getDetailedStockValues();


        // AJOUTS POUR BI DASHBOARD
    long countByStockQuantityEquals(int quantity);

    long countByStockQuantityLessThanEqualAndStockQuantityGreaterThan(int max, int min);

    @Query("SELECT AVG(a.stockTurnoverRate) FROM Articles a")
    Double getAverageTurnoverRate();

}
