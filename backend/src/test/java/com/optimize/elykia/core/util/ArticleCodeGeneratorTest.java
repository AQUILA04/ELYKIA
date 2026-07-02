package com.optimize.elykia.core.util;

import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.entity.article.Articles;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class ArticleCodeGeneratorTest {

    @Test
    void generate_ShouldConcatenateAllParts() {
        Articles article = new Articles();
        article.setType("TOMATE");
        article.setMarque("SUPER8");
        article.setModel("70G PETIT");
        article.setName("SUPER 8");
        article.setCreditSalePrice(150);

        assertThat(ArticleCodeGenerator.generate(article)).isEqualTo("TOMSU70S8150");
    }

    @Test
    void generate_ShouldExtractNameInitialsFromMultipleWords() {
        assertThat(ArticleCodeGenerator.generate("RIZ", "RIZ BLANC", "25KG", "nom article", 13500))
                .isEqualTo("RIZRI25NA13500");
    }

    @ParameterizedTest
    @CsvSource({
            "TOM, TOMATE, 3",
            "SU, SUPER8, 2",
            "70, '70G PETIT', 2",
            "'', '', 3"
    })
    void prefix_ShouldTakeFirstCharacters(String expected, String value, int length) {
        assertThat(ArticleCodeGenerator.prefix(value, length)).isEqualTo(expected);
    }

    @Test
    void extractNameInitials_ShouldReturnUppercaseInitials() {
        assertThat(ArticleCodeGenerator.extractNameInitials("nom article")).isEqualTo("NA");
        assertThat(ArticleCodeGenerator.extractNameInitials("  BONJOURNE   maïs ")).isEqualTo("BM");
    }

    @Test
    void formatCreditSalePrice_ShouldOmitDecimalPartForWholeNumbers() {
        assertThat(ArticleCodeGenerator.formatCreditSalePrice(150.0)).isEqualTo("150");
        assertThat(ArticleCodeGenerator.formatCreditSalePrice(99.5)).isEqualTo("99.5");
    }
}
