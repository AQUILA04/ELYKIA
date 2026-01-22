package com.optimize.common.securities.util;

import javax.swing.plaf.PanelUI;

public class AuthorityConstant {
    private AuthorityConstant() {
        // Default constructor
    }

    public static final String ADMIN = "ROLE_ADMIN";
    public static final String USER = "ROLE_USER";
    public static final String READ_GLOBAL = "ROLE_READ_GLOBAL";
    public static final String WRITE_GLOBAL = "ROLE_WRITE_GLOBAL";
    public static final String SOFT_DELETE = "ROLE_SOFT_DELETE";
    public static final String HARD_DELETE = "ROLE_HARD_DELETE";
}
