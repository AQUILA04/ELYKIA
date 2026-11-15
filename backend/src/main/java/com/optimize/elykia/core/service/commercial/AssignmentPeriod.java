package com.optimize.elykia.core.service.commercial;

import java.time.LocalDate;

/**
 * Périodes inclusives. Une fin absente court jusqu'à la fin des temps :
 * une seule personne tient le compte à un instant donné.
 */
final class AssignmentPeriod {

    private AssignmentPeriod() {
    }

    static boolean overlaps(LocalDate startA, LocalDate endA, LocalDate startB, LocalDate endB) {
        LocalDate aEnd = endA == null ? LocalDate.MAX : endA;
        LocalDate bEnd = endB == null ? LocalDate.MAX : endB;
        return !startA.isAfter(bEnd) && !startB.isAfter(aEnd);
    }
}
