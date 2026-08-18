package com.optimize.elykia.core.service.tontine;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class CarnetVerificationColumnLayoutTest {

    @Test
    void paginateFillsColumnsBeforeNextPage() {
        List<String> names = List.of("A1", "A2", "A3", "B1", "C1");
        List<List<List<String>>> pages = CarnetVerificationColumnLayout.paginate(names);

        assertThat(pages).hasSize(1);
        assertThat(pages.get(0).get(0)).containsExactly("A1", "A2", "A3", "B1", "C1");
        assertThat(pages.get(0).get(1)).isEmpty();
        assertThat(pages.get(0).get(2)).isEmpty();
    }

    @Test
    void paginateSplitsOverflowToNextColumnThenNextPage() {
        int rows = CarnetVerificationColumnLayout.ROWS_PER_COLUMN;
        List<String> names = IntStream.rangeClosed(1, rows * 3 + 2)
                .mapToObj(i -> "N" + i)
                .toList();

        List<List<List<String>>> pages = CarnetVerificationColumnLayout.paginate(names);

        assertThat(pages).hasSize(2);
        assertThat(pages.get(0).get(0)).hasSize(rows);
        assertThat(pages.get(0).get(0).get(0)).isEqualTo("N1");
        assertThat(pages.get(0).get(1).get(0)).isEqualTo("N" + (rows + 1));
        assertThat(pages.get(0).get(2).get(0)).isEqualTo("N" + (rows * 2 + 1));
        assertThat(pages.get(1).get(0)).containsExactly("N" + (rows * 3 + 1), "N" + (rows * 3 + 2));
        assertThat(pages.get(1).get(1)).isEmpty();
        assertThat(pages.get(1).get(2)).isEmpty();
    }

    @Test
    void paginateEmptyReturnsOneBlankPage() {
        List<List<List<String>>> pages = CarnetVerificationColumnLayout.paginate(List.of());
        assertThat(pages).hasSize(1);
        assertThat(pages.get(0)).hasSize(3);
        assertThat(pages.get(0).get(0)).isEmpty();
    }
}
