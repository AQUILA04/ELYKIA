package com.optimize.elykia.client.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;


@ConfigurationProperties(prefix = "optimize.client")
@Getter
@Setter
public class ClientProperties {
    private Map<String, ClientInfo> info = new HashMap<>();


    @Getter
    @Setter
    public static class ClientInfo {
        private String firstname;
        private String lastname;
        private String address;
        private String phone;
        private String cardID;
        private String cardType;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate dateOfBirth;
        private String collector;
        private String quarter;
        private String type;
        private String occupation;
        private ClientAccount account;
    }

    @Getter
    @Setter
    public static class ClientAccount {
        private String accountNumber;
        private Double accountBalance;
    }
}
