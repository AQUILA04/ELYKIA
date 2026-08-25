package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyUnrecoveredCreditDto {
    private Long id;
    private String reference;
    private Double dailyStake;
    /** Montant restant net du reliquat client (à encaisser). */
    private Double totalAmountRemaining;
    private Long clientId;
    private String clientFirstname;
    private String clientLastname;
    private String clientQuarter;
    private String clientOccupation;

    @JsonProperty("client")
    public ClientSummary getClient() {
        String fullName = buildFullName(clientFirstname, clientLastname);
        return new ClientSummary(clientFirstname, clientLastname, clientQuarter, clientOccupation, fullName);
    }

    private static String buildFullName(String firstname, String lastname) {
        if (firstname == null && lastname == null) {
            return "";
        }
        if (firstname == null) {
            return lastname;
        }
        if (lastname == null) {
            return firstname;
        }
        return firstname + " " + lastname;
    }

    @Data
    @AllArgsConstructor
    public static class ClientSummary {
        private String firstname;
        private String lastname;
        private String quarter;
        private String occupation;
        private String fullName;
    }
}
