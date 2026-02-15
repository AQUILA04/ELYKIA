package com.optimize.elykia.core.repository.spec;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.CreditSearchDto;
import com.optimize.elykia.core.entity.Credit;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

public class CreditSpecification {
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public static Specification<Credit> build(CreditSearchDto dto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (dto == null) {
                predicates.add(cb.equal(root.get("state"), State.ENABLED));
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // clientType
            if (dto.clientType() != null) {
                predicates.add(cb.equal(root.get("clientType"), dto.clientType()));
            }

            // type (OperationType)
            if (dto.type() != null) {
                predicates.add(cb.equal(root.get("type"), dto.type()));
            }

            // status
            if (dto.status() != null) {
                predicates.add(cb.equal(root.get("status"), dto.status()));
            }

            if (StringUtils.hasText(dto.commercial())) {
                predicates.add(cb.equal(root.get("collector"), dto.commercial().trim()));
            }

            // clientId
            if (dto.clientId() != null) {
                predicates.add(cb.equal(root.get("client").get("id"), dto.clientId()));
            }

            // keyword handling
            String kw = dto.keyword();
            if (kw != null && !kw.isBlank()) {
                kw = kw.trim();
                List<Predicate> kwPreds = new ArrayList<>();

                // date range detection: "dd/MM/yyyy-dd/MM/yyyy"
                if (kw.contains("-")) {
                    String[] parts = kw.split("-", 2);
                    try {
                        LocalDate start = LocalDate.parse(parts[0].trim(), DATE_FMT);
                        LocalDate end = LocalDate.parse(parts[1].trim(), DATE_FMT);
                        // search across several LocalDate fields
                        Path<LocalDate> beginDate = root.get("beginDate");
                        Path<LocalDate> expectedEndDate = root.get("expectedEndDate");
                        Path<LocalDate> effectiveEndDate = root.get("effectiveEndDate");
                        Path<LocalDate> accountingDate = root.get("accountingDate");
                        Path<LocalDate> releaseDate = root.get("releaseDate");

                        kwPreds.add(cb.between(beginDate, start, end));
                        kwPreds.add(cb.between(expectedEndDate, start, end));
                        kwPreds.add(cb.between(effectiveEndDate, start, end));
                        kwPreds.add(cb.between(accountingDate, start, end));
                        kwPreds.add(cb.between(releaseDate, start, end));
                    } catch (DateTimeParseException ignored) {
                        // not a date range -> fall through to other checks
                    }
                } else {
                    // single date?
                    try {
                        LocalDate single = LocalDate.parse(kw, DATE_FMT);
                        Path<LocalDate> beginDate = root.get("beginDate");
                        Path<LocalDate> expectedEndDate = root.get("expectedEndDate");
                        Path<LocalDate> effectiveEndDate = root.get("effectiveEndDate");
                        Path<LocalDate> accountingDate = root.get("accountingDate");
                        Path<LocalDate> releaseDate = root.get("releaseDate");

                        kwPreds.add(cb.equal(beginDate, single));
                        kwPreds.add(cb.equal(expectedEndDate, single));
                        kwPreds.add(cb.equal(effectiveEndDate, single));
                        kwPreds.add(cb.equal(accountingDate, single));
                        kwPreds.add(cb.equal(releaseDate, single));
                    } catch (DateTimeParseException e) {
                        // not a date -> try numeric or string
                        // numeric?
                        if (kw.matches("-?\\d+(\\.\\d+)?")) {
                            try {
                                // try integer id
                                Long asLong = Long.parseLong(kw);
                                kwPreds.add(cb.equal(root.get("id").as(Long.class), asLong));
                            } catch (NumberFormatException ignored) {
                            }
                            try {
                                Double asDouble = Double.parseDouble(kw);
                                // numeric fields to compare
                                kwPreds.add(cb.equal(root.get("totalAmount").as(Double.class), asDouble));
                                kwPreds.add(cb.equal(root.get("totalAmountPaid").as(Double.class), asDouble));
                                kwPreds.add(cb.equal(root.get("totalAmountRemaining").as(Double.class), asDouble));
                                kwPreds.add(cb.equal(root.get("dailyStake").as(Double.class), asDouble));
                                kwPreds.add(cb.equal(root.get("advance").as(Double.class), asDouble));
                                kwPreds.add(cb.equal(root.get("totalPurchase").as(Double.class), asDouble));
                            } catch (NumberFormatException ignored) {
                            }
                        } else {
                            // string search (LIKE %kw%) on common string fields
                            String pattern = "%" + kw.toLowerCase() + "%";
                            kwPreds.add(cb.like(cb.lower(root.get("collector").as(String.class)), pattern));
                            kwPreds.add(cb.like(cb.lower(root.get("reference").as(String.class)), pattern));
                            kwPreds.add(cb.like(cb.lower(root.get("oldReference").as(String.class)), pattern));
                            kwPreds.add(cb.like(cb.lower(root.get("distributionZone").as(String.class)), pattern));
                            kwPreds.add(cb.like(cb.lower(root.get("customerSegment").as(String.class)), pattern));
                            // also try client fields if present via join-less access: client.name (safe only if client is fetched)
                            try {
                                Expression<String> clientName = root.get("client").get("firstname").as(String.class);
                                kwPreds.add(cb.like(cb.lower(clientName), pattern));
                                kwPreds.add(cb.like(cb.lower(root.get("client").get("lastname").as(String.class)), pattern));
                            } catch (IllegalArgumentException ignored2) {
                                // ignore if path not resolvable
                            }
                        }
                    }
                }

                if (!kwPreds.isEmpty()) {
                    predicates.add(cb.or(kwPreds.toArray(new Predicate[0])));
                }
            }

            predicates.add(cb.equal(root.get("state"), State.ENABLED));
            
            // Default sort by id desc if no sort is applied by pageable (though pageable usually handles it)
            // But Specification is for filtering. Sorting is handled by Pageable passed to repository.

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
