package com.optimize.elykia.core.util;

public class UserPermissionConstant {
    private UserPermissionConstant() {
        // Default Constructor
    }

    public static final String SU = "ROLE_ROOT";
    public static final String MANAGER = "ROLE_MANAGER";
    public static final String ADMIN = "ROLE_ADMIN";
    public static final String PROMOTER = "ROLE_PROMOTER";

    public static final String EDIT_ARTICLE = "ROLE_EDIT_ARTICLE";
    public static final String CONSULT_ARTICLE = "ROLE_CONSULT_ARTICLE";
    public static final String DEL_ARTICLE = "ROLE_DEL_ARTICLE";

    public static final String EDIT_CLIENT = "ROLE_EDIT_CLIENT";
    public static final String CONSULT_CLIENT = "ROLE_CONSULT_CLIENT";
    public static final String DEL_CLIENT = "ROLE_DEL_CLIENT";

    public static final String EDIT_LOCALITY = "ROLE_EDIT_LOCALITY";
    public static final String CONSULT_LOCALITY = "ROLE_LOCALITY";
    public static final String DEL_LOCALITY = "ROLE_DEL_LOCALITY";

    public static final String EDIT_ACCOUNT = "ROLE_EDIT_ACCOUNT";
    public static final String CONSULT_ACCOUNT = "ROLE_ACCOUNT";
    public static final String DEL_ACCOUNT = "ROLE_DEL_ACCOUNT";

    public static final String EDIT_PROMOTER = "ROLE_EDIT_PROMOTER";
    public static final String CONSULT_PROMOTER = "ROLE_PROMOTER";
    public static final String DEL_PROMOTER = "ROLE_DEL_PROMOTER";

    public static final String OPEN_ACCOUNTING_DAY = "ROLE_OPEN_ACCOUNTING_DAY";
    public static final String CLOSE_ACCOUNTING_DAY = "ROLE_CLOSE_ACCOUNTING_DAY";
    public static final String CONSULT_OPEN_ACCOUNTING_DAY = "ROLE_CONSULT_OPEN_ACCOUNTING_DAY";

    public static final String EDIT_CREDIT = "ROLE_EDIT_CREDIT";
    public static final String CONSULT_CREDIT = "ROLE_CONSULT_CREDIT";
    public static final String DEL_CREDIT = "ROLE_DEL_CREDIT";
    public static final String VALIDATE_CREDIT = "ROLE_VALIDATE_CREDIT";
    public static final String START_CREDIT = "ROLE_START_CREDIT";


    public static final String EDIT_TONTINE = "ROLE_EDIT_TONTINE";
    public static final String CONSULT_TONTINE = "ROLE_CONSULT_TONTINE";
    public static final String DEL_TONTINE = "ROLE_DEL_TONTINE";

    public static final String EDIT_USER = "ROLE_EDIT_USER";
    public static final String CONSULT_USER = "ROLE_CONSULT_USER";
    public static final String DEL_USER = "ROLE_DEL_USER";

    public static final String OPEN_CASH_DESK = "ROLE_OPEN_CASH_DESK";
    public static final String CONSULT_DASHBOARD = "ROLE_CONSULT_DASHBOARD";
    public static final String CLOSE_CASH_DESK = "ROLE_CLOSE_CASH_DESK";
    public static final String SHOW_PURCHASE_PRICE = "ROLE_SHOW_PURCHASE_PRICE";

    public static final String AGENCY_DEPOSIT_CONSULT = "ROLE_CONSULT_AGENCY_DEPOSIT";
    public static final String AGENCY_DEPOSIT_EDIT = "ROLE_EDIT_AGENCY_DEPOSIT";
    public static final String AGENCY_DEPOSIT_DEL = "ROLE_DEL_AGENCY_DEPOSIT";

    public static final String AGENCY_REPORT_CONSULT = "ROLE_CONSULT_AGENCY_REPORT";
    public static final String AGENCY_REPORT_EDIT = "ROLE_EDIT_AGENCY_REPORT";
    public static final String AGENCY_REPORT_DEL = "ROLE_DEL_AGENCY_REPORT";

    public static final String RECOVERY_MANAGER = "ROLE_RECOVERY_MANAGER";

    public static final String STOREKEEPER = "ROLE_STOREKEEPER";

    public static final String STOREKEEPER_DASHBOARD = "ROLE_STOREKEEPER_DASHBOARD";

    public static final String REPORT = "ROLE_REPORT";

    public static final String AI_CHAT = "ROLE_AI_CHAT";
    public static final String AI_REPORT = "ROLE_AI_REPORT";

    public static final String CONSULT_TONTINE_COLLECTION_RESET = "ROLE_CONSULT_TONTINE_COLLECTION_RESET";

    /** Archivage PDF et réinitialisation des collectes tontine (ADMIN uniquement). */
    public static final String RESET_TONTINE_COLLECTIONS = "ROLE_RESET_TONTINE_COLLECTIONS";
    public static final String CANCEL_TONTINE_COLLECTION = "ROLE_CANCEL_TONTINE_COLLECTION";

    public static final String CREATE_INVENTORY = "ROLE_CREATE_INVENTORY";
    public static final String RECONCILE_INVENTORY = "ROLE_RECONCILE_INVENTORY";
    public static final String FINALIZE_INVENTORY = "ROLE_FINALIZE_INVENTORY";

    public static final String ASSIGN_CLIENT_COLLECTOR = "ROLE_ASSIGN_CLIENT_COLLECTOR";

}
