package com.optimize.elykia.core.service.customer;

import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.config.CustomerMobileMoneyProperties;
import com.optimize.elykia.core.entity.customer.CommercialMobileMoneyConfig;
import com.optimize.elykia.core.repository.customer.CommercialMobileMoneyConfigRepository;
import com.optimize.elykia.core.service.user.UserManagement;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialMobileMoneyConfigServiceTest {

    @Mock
    private CommercialMobileMoneyConfigRepository repository;
    @Mock
    private UserManagement userManagement;
    @Mock
    private CustomerMobileMoneyProperties globalProperties;

    @InjectMocks
    private CommercialMobileMoneyConfigService service;

    private User commercial;

    @BeforeEach
    void setUp() {
        commercial = new User();
        commercial.setFirstname("Jean");
        commercial.setLastname("Commercial");
        commercial.setPhone("90111111");
        commercial.setUserAccount(new com.optimize.common.securities.models.UserAccount());
        commercial.getUserAccount().setUsername("COM001");
    }

    @Test
    void resolveForCollector_usesCommercialNumbersWhenConfigured() {
        CommercialMobileMoneyConfig config = new CommercialMobileMoneyConfig();
        config.setCommercialUsername("COM001");
        config.setMixxNumber("91111111");
        config.setMoovNumber("92222222");

        when(globalProperties.getMixxNumber()).thenReturn("90000000");
        when(globalProperties.getMoovNumber()).thenReturn("97000000");
        when(repository.findByCommercialUsername("COM001")).thenReturn(Optional.of(config));
        when(userManagement.getPromoters()).thenReturn(List.of(commercial));

        var result = service.resolveForCollector("COM001");

        assertThat(result.getMixxNumber()).isEqualTo("91111111");
        assertThat(result.getMoovNumber()).isEqualTo("92222222");
        assertThat(result.isMixxUsesGlobalDefault()).isFalse();
        assertThat(result.isMoovUsesGlobalDefault()).isFalse();
        assertThat(result.getCollectorName()).isEqualTo("Jean Commercial");
    }

    @Test
    void resolveForCollector_fallsBackToGlobalDefaults() {
        when(globalProperties.getMixxNumber()).thenReturn("90000000");
        when(globalProperties.getMoovNumber()).thenReturn("97000000");
        when(repository.findByCommercialUsername("COM001")).thenReturn(Optional.empty());
        when(userManagement.getPromoters()).thenReturn(List.of(commercial));

        var result = service.resolveForCollector("COM001");

        assertThat(result.getMixxNumber()).isEqualTo("90000000");
        assertThat(result.getMoovNumber()).isEqualTo("97000000");
        assertThat(result.isMixxUsesGlobalDefault()).isTrue();
        assertThat(result.isMoovUsesGlobalDefault()).isTrue();
    }
}
