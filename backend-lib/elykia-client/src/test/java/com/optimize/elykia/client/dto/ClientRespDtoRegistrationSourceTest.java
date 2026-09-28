package com.optimize.elykia.client.dto;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientRegistrationSource;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ClientRespDtoRegistrationSourceTest {

    @Test
    void fromClient_mapsCustomerSpaceSource() {
        Client client = new Client();
        client.setId(1L);
        client.setFirstname("Ada");
        client.setLastname("Lovelace");
        client.setRegistrationSource(ClientRegistrationSource.CUSTOMER_SPACE);

        ClientRespDto dto = ClientRespDto.fromClient(client);

        assertEquals(ClientRegistrationSource.CUSTOMER_SPACE, dto.registrationSource());
    }

    @Test
    void fromClient_defaultsNullSourceToStaff() {
        Client client = new Client();
        client.setId(2L);
        client.setFirstname("Staff");
        client.setLastname("Client");
        client.setRegistrationSource(null);

        ClientRespDto dto = ClientRespDto.fromClient(client);

        assertEquals(ClientRegistrationSource.STAFF, dto.registrationSource());
    }

    @Test
    void fromClient_nullClientReturnsNull() {
        assertNull(ClientRespDto.fromClient(null));
    }
}
