package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.article.Articles;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public final class ArticleCodeGenerator {

    private ArticleCodeGenerator() {
    }

    public static String generate(Articles article) {
        return generate(
                article.getType(),
                article.getMarque(),
                article.getModel(),
                article.getName(),
                article.getCreditSalePrice());
    }

    public static String generate(String type, String marque, String model, String name, double creditSalePrice) {
        return prefix(type, 3)
                + prefix(marque, 2)
                + prefix(model, 2)
                + extractNameInitials(name)
                + formatCreditSalePrice(creditSalePrice);
    }

    static String prefix(String value, int length) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.substring(0, Math.min(length, trimmed.length())).toUpperCase(Locale.ROOT);
    }

    static String extractNameInitials(String name) {
        if (!StringUtils.hasText(name)) {
            return "";
        }
        return Arrays.stream(name.trim().split("\\s+"))
                .filter(word -> !word.isEmpty())
                .map(word -> String.valueOf(Character.toUpperCase(word.charAt(0))))
                .collect(Collectors.joining());
    }

    static String formatCreditSalePrice(double creditSalePrice) {
        long asLong = (long) creditSalePrice;
        if (Double.compare(creditSalePrice, (double) asLong) == 0) {
            return String.valueOf(asLong);
        }
        return BigDecimal.valueOf(creditSalePrice).stripTrailingZeros().toPlainString();
    }
}
