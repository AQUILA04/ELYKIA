package com.optimize.common.entities.util;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.*;
import java.util.function.Supplier;

public class NullishUtils {

    /**
     * Retourne l'objet s'il n'est pas null, sinon retourne null pour les objets
     * et 0 pour les types numériques
     */
    @SuppressWarnings("unchecked")
    public static <T> T valueOrNullZero(T obj) {
        return obj;
    }

    /**
     * Version avec type explicite pour les primitifs
     */
    public static Integer valueOrZero(Integer value) {
        return value != null ? value : 0;
    }

    public static Long valueOrZero(Long value) {
        return value != null ? value : 0L;
    }

    public static Double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    public static Float valueOrZero(Float value) {
        return value != null ? value : 0.0f;
    }

    /**
     * Retourne la première valeur si non null, sinon la seconde valeur
     * (équivalent du ?? en TypeScript)
     */
    public static <T> T coalesce(T value, T defaultValue) {
        return value != null ? value : defaultValue;
    }

    /**
     * Version avec Supplier pour le defaultValue (évaluation paresseuse)
     */
    public static <T> T coalesceLazy(T value, Supplier<T> defaultValueSupplier) {
        return value != null ? value : defaultValueSupplier.get();
    }

    /**
     * Version avec plusieurs valeurs (retourne la première non null)
     */
    @SafeVarargs
    public static <T> T coalesce(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    /**
     * Version avec gestion des chaînes vides
     */
    public static String coalesceString(String value, String defaultValue) {
        return value != null && !value.isEmpty() ? value : defaultValue;
    }

    /**
     * Version avec gestion des collections vides
     */
    public static <T, C extends Collection<T>> C coalesceCollection(C value, C defaultValue) {
        return value != null && !value.isEmpty() ? value : defaultValue;
    }

    /**
     * Version avec gestion des Optional
     */
    public static <T> T coalesceOptional(Optional<T> optional, T defaultValue) {
        return optional.orElse(defaultValue);
    }
}