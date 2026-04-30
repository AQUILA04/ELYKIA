package com.optimize.elykia.core.service.user;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class UserManagement {
    private final UserService userService;

    public List<User> getPromoters() {
        return userService.getByUserProfil(UserProfilConstant.PROMOTER);
    }

}
