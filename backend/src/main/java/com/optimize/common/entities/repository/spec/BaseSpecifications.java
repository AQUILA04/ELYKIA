package com.optimize.common.entities.repository.spec;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.ListJoin;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.SetJoin;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Objects;

@NoArgsConstructor
public class BaseSpecifications {

    public static <T> Specification<T> contains(Specification<T> spec, String attribute, String value) {
        Specification<T> specification = spec;
        if (!Objects.isNull(value) && !value.isEmpty()) {
            specification = spec.and(contains(attribute, value));
        }

        return specification;
    }

    public static <T> Specification<T> contains(String attribute, String value) {
        return (root, query, cb) ->
            cb.like(cb.lower(from(root, attribute)), "%" + value.toLowerCase() + "%");
    }

    public static <T> Specification<T> equal(Specification<T> spec, String attribute, Object value) {
        Specification<T> specification = spec;
        if (!Objects.isNull(value)) {
            specification = spec.and(equal(attribute, value));
        }

        return specification;
    }

    public static <T> Specification<T> equal(String attribute, Object value) {
        return (root, query, cb) ->
            cb.equal(from(root, attribute), value);
    }

    public static <T> Specification<T> equal(Specification<T> spec, Class<?> clazz) {
        Specification<T> specification = spec;
        if (!Objects.isNull(clazz)) {
            specification = spec.and(equal(clazz));
        }

        return specification;
    }

    public static <T> Specification<T> equal(Class<?> clazz) {
        return (root, query, cb) ->
            cb.equal(root.type(), clazz);
    }

    public static <R> Specification<R> listJoinIn(Specification<R> spec, String attributeListToJoin, String attribute, String value) {
        Specification<R> specification = spec;
        if (StringUtils.hasText(value)) {
            specification = spec.and(listJoinIn(attributeListToJoin, attribute, value));
        }
        return specification;
    }

    public static <R, J> Specification<R> listJoinIn(String attributeListToJoin, String attribute, String value) {
        return (root, query, cb) -> {
            ListJoin<R, J> join = root.joinList(attributeListToJoin);
            return cb.like(cb.lower(from(join, attribute)), "%" + value.toLowerCase() + "%");
        };
    }

    public static <T> Specification<T> lessThanOrEqualTo(String attribute, Date date, String function, String pattern) {
        return (root, query, cb) ->
            cb.lessThanOrEqualTo(cb.function(function, String.class, from(root, attribute), cb.literal(pattern)), formatToDate(date, pattern));
    }

    public static <T> Specification<T> lessThanOrEqualTo(Specification<T> spec, String attribute, Date date, String function, String pattern) {
        Specification<T> specification = spec;
        if (date != null) {
            specification = spec.and(lessThanOrEqualTo(attribute, date, function, pattern));
        }
        return specification;
    }

    public static <T> Specification<T> greaterThanOrEqualTo(String attribute, Date date, String function, String pattern) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(cb.function(function, String.class, from(root, attribute), cb.literal(pattern)), formatToDate(date, pattern));
    }

    public static <T> Specification<T> greaterThanOrEqualTo(Specification<T> spec, String attribute, Date date, String function, String pattern) {
        Specification<T> specification = spec;
        if (date != null) {
            specification = spec.and(greaterThanOrEqualTo(attribute, date, function, pattern));
        }
        return specification;
    }

    public static <E extends Enum<E>, T> Specification<T> enumMatcher(String attribute, E queriedValue) {
        return (root, query, cb) -> cb.equal(from(root, attribute), queriedValue);
    }

    public static <E extends Enum<E>, T> Specification<T> enumMatcher(Specification<T> spec, String attribute, E queriedValue) {
        Specification<T> specification = spec;
        if (queriedValue != null) {
            specification = spec.and(enumMatcher(attribute, queriedValue));
        }
        return specification;
    }

    public static <T> Path<T> from(Path<?> root, String attribute) {
        String[] tabAttr = attribute.split("\\.");
        int size = tabAttr.length;
        Path<T> path = root.get(tabAttr[0]);

        for(int i = 1; i < size; ++i) {
            path = path.get(tabAttr[i]);
        }
        return path;
    }

    private static String formatToDate(Date date, String pattern) {
        SimpleDateFormat sdf = new SimpleDateFormat(pattern);
        return sdf.format(date);
    }

    public static <T> Specification<T> contains(Specification<T> spec, Class<?> clazz, String attribute, String subAttribute, String value) {
        Specification<T> specifications = spec;
        if (!Objects.isNull(value) && !value.isEmpty()) {
            specifications = spec.and(contains(clazz, attribute, subAttribute, value));
        }

        return specifications;
    }

    public static <T> Specification<T> in(Specification<T> spec, String attribute, Object value) {
        Specification<T> specifications = spec;
        if (Objects.nonNull(value)) {
            specifications = spec.and(in(attribute, value));
        }

        return specifications;
    }

    public static <T> Specification<T> in(String attribute, Object value) {
        return (root, query, cb) -> cb.in(from(root, attribute)).value(value);
    }

    public static <T> Specification<T> contains(Class<?> clazz, String attribute, String subAttribute, String value) {
        return (root, query, cb) -> {
            String[] tabAttr = attribute.split("\\.");
            int size = tabAttr.length;
            int lastIndex = size - 1;
            Join<?, ?> subClassPath;
            if (size > 1) {
                Join<?, ?> joinPath = root.join(tabAttr[0]);

                for(int i = 1; i < lastIndex; ++i) {
                    joinPath = joinPath.join(tabAttr[i]);
                }
                subClassPath = cb.treat(joinPath.join(tabAttr[lastIndex]), clazz);
            } else {
                subClassPath = cb.treat(root.join(attribute), clazz);
            }
            return cb.like(cb.lower(from(subClassPath, subAttribute)), "%" + value.toLowerCase() + "%");
        };
    }

    public static <T> Specification<T> isEqual(Specification<T> spec, String attribute, Object value) {
        Specification<T> specifications = spec;
        if (!Objects.isNull(value)) {
            specifications = spec.and(isEqual(attribute, value));
        }
        return specifications;
    }

    public static <T> Specification<T> isEqual(String attribute, Object value) {
        return (root, query, cb) -> cb.equal(from(root, attribute), value);

    }

    public static <T> Specification<T> isEqual(Specification<T> spec, Class<?> clazz) {
        Specification<T> specifications = spec;
        if (!Objects.isNull(clazz)) {
            specifications = spec.and(isEqual(clazz));
        }
        return specifications;
    }

    public static <T> Specification<T> isEqual(Class<?> clazz) {
        return (root, query, cb) -> cb.equal(root.type(), clazz);
    }

    public static <R> Specification<R> setJoinIn(Specification<R> spec, String attributeListToJoin, String attribute, String value) {
        if (StringUtils.hasText(value)) {
            spec = spec.and(setJoinIn(attributeListToJoin, attribute, value));
        }
        return spec;
    }

    public static <R, J> Specification<R> setJoinIn(String attributeListToJoin, String attribute, String value) {
        return (root, query, cb) -> {
            SetJoin<R, J> join = root.joinSet(attributeListToJoin);
            return cb.like(cb.lower(from(join, attribute)), "%" + value.toLowerCase() + "%");
        };
    }

    public static <T> Specification<T> isNull(String attribute) {
        return (root, query, cb) -> cb.isNull(from(root, attribute));
    }

    public static <T> Specification<T> isNotNull(String attribute) {
        return (root, query, cb) -> cb.isNotNull(from(root, attribute));
    }

    public static <T> Specification<T> isEmpty(String attribute) {
        return (root, query, cb) -> cb.isEmpty(from(root, attribute));
    }

    public static <T> Specification<T> isNotEmpty(String attribute) {
        return (root, query, cb) -> cb.isNotEmpty(from(root, attribute));
    }

    public static <T> Specification<T> isTrue(String attribute) {
        return (root, query, cb) -> cb.isTrue(from(root, attribute));
    }

    public static <T> Specification<T> isFalse(String attribute) {
        return (root, query, cb) -> cb.isFalse(from(root, attribute));
    }
}
