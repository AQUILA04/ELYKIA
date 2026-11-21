package com.optimize.elykia.organization.application;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.shared.cache.CacheNames;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class UserManagement {
    private final UserService userService;

    @Cacheable(cacheNames = CacheNames.PROMOTERS)
    public List<User> getPromoters() {
        return userService.getByUserProfil(UserProfilConstant.PROMOTER);
    }

}
