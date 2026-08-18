package com.optimize.elykia.core.service.tontine;

import java.util.ArrayList;
import java.util.List;

/**
 * Découpe une liste triée en pages de 3 colonnes, remplissage colonne d'abord
 * (haut → bas, puis colonne suivante, puis page suivante).
 */
public final class CarnetVerificationColumnLayout {

    public static final int ROWS_PER_COLUMN = 40;
    public static final int COLUMN_COUNT = 3;
    public static final int ITEMS_PER_PAGE = ROWS_PER_COLUMN * COLUMN_COUNT;

    private CarnetVerificationColumnLayout() {
    }

    public static <T> List<List<List<T>>> paginate(List<T> items) {
        if (items == null || items.isEmpty()) {
            return List.of(emptyPage());
        }
        List<List<List<T>>> pages = new ArrayList<>();
        for (int offset = 0; offset < items.size(); offset += ITEMS_PER_PAGE) {
            int end = Math.min(offset + ITEMS_PER_PAGE, items.size());
            List<T> chunk = items.subList(offset, end);
            List<List<T>> columns = new ArrayList<>(COLUMN_COUNT);
            for (int column = 0; column < COLUMN_COUNT; column++) {
                int from = column * ROWS_PER_COLUMN;
                if (from >= chunk.size()) {
                    columns.add(List.of());
                    continue;
                }
                int to = Math.min(from + ROWS_PER_COLUMN, chunk.size());
                columns.add(List.copyOf(chunk.subList(from, to)));
            }
            pages.add(List.copyOf(columns));
        }
        return List.copyOf(pages);
    }

    private static <T> List<List<T>> emptyPage() {
        return List.of(List.of(), List.of(), List.of());
    }
}
