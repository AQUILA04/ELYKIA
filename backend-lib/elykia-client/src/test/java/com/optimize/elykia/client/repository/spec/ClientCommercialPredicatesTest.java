package com.optimize.elykia.client.repository.spec;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientCommercialPredicatesTest {

    @Test
    void matchesTontineCollectorWhenCreditCollectorDiffers() {
        assertThat(ClientCommercialPredicates.matches(
                "COM_TONTINE", "COM_CREDIT", "COM_TONTINE", null, null)).isTrue();
    }

    @Test
    void matchesAgencyCollectorWhenCreditCollectorDiffers() {
        assertThat(ClientCommercialPredicates.matches(
                "COM_AGENCE", "COM_CREDIT", null, "COM_AGENCE", null)).isTrue();
    }

    @Test
    void matchesRecoveryCollector() {
        assertThat(ClientCommercialPredicates.matches(
                "COM_REC", "COM_CREDIT", null, null, "COM_REC")).isTrue();
    }

    @Test
    void matchesCreditCollector() {
        assertThat(ClientCommercialPredicates.matches(
                "COM_CREDIT", "COM_CREDIT", "COM_TONTINE", null, null)).isTrue();
    }

    @Test
    void doesNotMatchUnrelatedCommercial() {
        assertThat(ClientCommercialPredicates.matches(
                "COM_OTHER", "COM_CREDIT", "COM_TONTINE", "COM_AGENCE", "COM_REC")).isFalse();
    }

    @Test
    void blankUsernameMatchesEveryone() {
        assertThat(ClientCommercialPredicates.matches(null, "COM_CREDIT", null, null, null)).isTrue();
        assertThat(ClientCommercialPredicates.matches("  ", "COM_CREDIT", null, null, null)).isTrue();
    }

    @Test
    void jpqlFragmentsCoverEveryCollectorRole() {
        assertThat(ClientCommercialPredicates.COLLECTOR_FIELDS).containsExactly(
                "collector", "tontineCollector", "agencyCollector", "recoveryCollector");
        assertThat(ClientCommercialPredicates.ANY_EQUALS_C_USERNAME)
                .contains("c.collector = :username")
                .contains("c.tontineCollector = :username")
                .contains("c.agencyCollector = :username")
                .contains("c.recoveryCollector = :username");
        assertThat(ClientCommercialPredicates.ANY_EQUALS_C_COLLECTOR)
                .contains("c.agencyCollector = :collector");
        assertThat(ClientCommercialPredicates.ANY_EQUALS_C_COMMERCIAL)
                .contains("c.agencyCollector = :commercial");
    }
}
