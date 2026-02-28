package com.optimize.elykia.core.service;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.security.services.UserAccountService;
import com.optimize.common.securities.security.services.UserPermissionService;
import com.optimize.common.securities.security.services.UserProfilService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.config.ManagerUserProperties;
import com.optimize.elykia.core.config.RootUserProperties;
import com.optimize.elykia.core.util.UserPermissionConstant;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class UserManagement {

    private final UserProfilService userProfilService;
    private final UserPermissionService userPermissionService;
    private final UserAccountService userAccountService;
    private final UserService userService;
    private final RootUserProperties rootUserProperties;
    private final ManagerUserProperties managerUserProperties;

    public void initialize() {
        initPermissions();
        initProfils();
        initAccounts();
    }

    private void initProfils() {
        List<String> profils = List.of(UserProfilConstant.SU, UserProfilConstant.ADMIN, UserProfilConstant.PROMOTER,
                "TEST", "GESTIONNAIRE", "STOREKEEPER", "AGENCY_USER", "AGENCY_DIRECTOR", "SECRETARY");
        profils.forEach(profil -> {
            if (Boolean.FALSE.equals(userProfilService.getRepository().existsByName(profil))) {
                UserProfil userProfil = new UserProfil(profil);
                Set<UserPermission> permissions = new HashSet<>();
                if (UserProfilConstant.SU.equals(profil)) {
                    getRootPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if (UserProfilConstant.ADMIN.equals(profil)) {
                    getManagerPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if (UserProfilConstant.PROMOTER.equals(profil)) {
                    getPromotersPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if ("TEST".equals(profil)) {
                    getTestPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if ("GESTIONNAIRE".equals(profil)) {
                    getGestionnairePermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if ("STOREKEEPER".equals(profil)) {
                    getStoreKeeperPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if ("AGENCY_USER".equals(profil)) {
                    getAgencyReportPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                if ("AGENCY_DIRECTOR".equals(profil)) {
                    getAgencyDepositPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }

                if ("SECRETARY".equals(profil)) {
                    getSecretaryPermissions().forEach(permission -> {
                        permissions.add(userPermissionService.getByName(permission.getName()));
                    });
                }
                userProfil.addPermissions(permissions);
                userProfilService.create(userProfil);
            }
        });
    }

    private void initPermissions() {
        getRootPermissions().forEach(permission -> {
            if (!userPermissionService.getRepository().existsByName(permission.getName())) {
                userPermissionService.create(permission);
            }
        });
    }

    private void initAccounts() {
        UserAccount userAccount = createRootUserAccount();
        createRootUser(userAccount);
        UserAccount managerAccount = createManagerUserAccount();
        createManagerUser(managerAccount);
        UserAccount collectorAccount = createCollectorUserAccount();
        createCollectorUser(collectorAccount);
        createTestUser(createTestUserAccount());
        createGestionnaireUser(createGestionnaireUserAccount());
        createStoreKeeperUser();
        createAgencyUser();
        createAgencyDirectorUser();
        createSecretaryUser();
        createSecretaryTALAUser();
        createStoreKeeperKODJOUser();
    }

    private UserAccount createRootUserAccount() {
        if (userAccountService.existsByUsername("root")) {
            return userAccountService.getByUsername("root");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("root");
            UserProfil suProfil = userProfilService.getByName(UserProfilConstant.SU);
            userAccount.setUserProfil(suProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.SU_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createManagerUserAccount() {
        if (userAccountService.existsByUsername("manager")) {
            return userAccountService.getByUsername("manager");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("manager");
            UserProfil suProfil = userProfilService.getByName(UserProfilConstant.ADMIN);
            userAccount.setUserProfil(suProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createCollectorUserAccount() {
        if (userAccountService.existsByUsername("agent101")) {
            return userAccountService.getByUsername("agent101");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("agent101");
            UserProfil promoterProfil = userProfilService.getByName(UserProfilConstant.PROMOTER);
            userAccount.setUserProfil(promoterProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createTestUserAccount() {
        if (userAccountService.existsByUsername("agent102")) {
            return userAccountService.getByUsername("agent102");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("agent102");
            UserProfil promoterProfil = userProfilService.getByName("TEST");
            userAccount.setUserProfil(promoterProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createGestionnaireUserAccount() {
        if (userAccountService.existsByUsername("ges003")) {
            return userAccountService.getByUsername("ges003");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("ges003");
            UserProfil promoterProfil = userProfilService.getByName("GESTIONNAIRE");
            userAccount.setUserProfil(promoterProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createSecretaryUserAccount() {
        if (userAccountService.existsByUsername("secret001")) {
            return userAccountService.getByUsername("secret001");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("secret001");
            UserProfil promoterProfil = userProfilService.getByName("SECRETARY");
            userAccount.setUserProfil(promoterProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createSecretaryTALAUserAccount() {
        if (userAccountService.existsByUsername("TOU98")) {
            return userAccountService.getByUsername("TOU98");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("TOU98");
            UserProfil promoterProfil = userProfilService.getByName("SECRETARY");
            userAccount.setUserProfil(promoterProfil);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword("906253");
            return userAccountService.create(userAccount);
        }
    }


    private UserAccount createStoreKeeperUserAccount() {
        if (userAccountService.existsByUsername("mag001")) {
            return userAccountService.getByUsername("mag001");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("mag001");
            UserProfil storekeeper = userProfilService.getByName("STOREKEEPER");
            userAccount.setUserProfil(storekeeper);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createStoreKeeperKODJOUserAccount() {
        if (userAccountService.existsByUsername("KBD88")) {
            return userAccountService.getByUsername("KBD88");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("KBD88");
            UserProfil storekeeper = userProfilService.getByName("STOREKEEPER");
            userAccount.setUserProfil(storekeeper);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword("98997545");
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createAgencyOperatorUserAccount() {
        if (userAccountService.existsByUsername("age001")) {
            return userAccountService.getByUsername("age001");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("age001");
            UserProfil storekeeper = userProfilService.getByName("AGENCY_USER");
            userAccount.setUserProfil(storekeeper);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private UserAccount createAgencyManagerUserAccount() {
        if (userAccountService.existsByUsername("dir001")) {
            return userAccountService.getByUsername("dir001");
        } else {
            UserAccount userAccount = new UserAccount();
            userAccount.setUsername("dir001");
            UserProfil storekeeper = userProfilService.getByName("AGENCY_DIRECTOR");
            userAccount.setUserProfil(storekeeper);
            userAccount.setActive(Boolean.TRUE);
            userAccount.setPassword(UserProfilConstant.MANAGER_DEF_PASS);
            return userAccountService.create(userAccount);
        }
    }

    private void createRootUser(UserAccount userAccount) {
        if (!userService.existsByEmail(rootUserProperties.getEmail())) {
            User user = userFrom(rootUserProperties);
            user.setUserAccount(userAccount);
            userService.create(user);
        }
    }

    private void createCollectorUser(UserAccount userAccount) {
        if (!userService.existsByEmail("agent101@gmail.com")) {
            User user = new User();
            user.setPhone("90000001");
            user.setFirstname("Agent");
            user.setLastname("Collector");
            user.setGender("MALE");
            user.setEmail("agent101@gmail.com");
            user.setUserAccount(userAccount);
            userService.create(user);
        }
    }

    private void createTestUser(UserAccount userAccount) {
        if (!userService.existsByEmail("agent102@gmail.com")) {
            User user = new User();
            user.setPhone("90000002");
            user.setFirstname("Agent");
            user.setLastname("TEST");
            user.setGender("MALE");
            user.setEmail("agent102@gmail.com");
            user.setUserAccount(userAccount);
            userService.create(user);
        }
    }

    private void createStoreKeeperUser() {
        if (!userService.existsByEmail("mag001@gmail.com")) {
            User user = new User();
            user.setPhone("90010102");
            user.setFirstname("Magasinier");
            user.setLastname("Magasinier");
            user.setGender("MALE");
            user.setEmail("mag001@gmail.com");
            user.setUserAccount(createStoreKeeperUserAccount());
            userService.create(user);
        }
    }

    private void createStoreKeeperKODJOUser() {
        if (!userService.existsByEmail("kodjo.adodo@gmail.com")) {
            User user = new User();
            user.setPhone("98881058");
            user.setFirstname("KODJO");
            user.setLastname("ADODO");
            user.setGender("MALE");
            user.setEmail("kodjo.adodo@gmail.com");
            user.setUserAccount(createStoreKeeperKODJOUserAccount());
            userService.create(user);
        }
    }

    private void createSecretaryUser() {
        if (!userService.existsByEmail("secret001@gmail.com")) {
            User user = new User();
            user.setPhone("90010105");
            user.setFirstname("Sécrétaire");
            user.setLastname("Sécrétaire");
            user.setGender("FEMALE");
            user.setEmail("secret001@gmail.com");
            user.setUserAccount(createSecretaryUserAccount());
            userService.create(user);
        }
    }

    private void createSecretaryTALAUser() {
        if (!userService.existsByEmail("tala@gmail.com")) {
            User user = new User();
            user.setPhone("90625352");
            user.setFirstname("TALA");
            user.setLastname("OUBOE");
            user.setGender("FEMALE");
            user.setEmail("tala@gmail.com");
            user.setUserAccount(createSecretaryTALAUserAccount());
            userService.create(user);
        }
    }

    private void createAgencyUser() {
        if (!userService.existsByEmail("age001@gmail.com")) {
            User user = new User();
            user.setPhone("90020203");
            user.setFirstname("Secrétaire");
            user.setLastname("Secrétaire");
            user.setGender("MALE");
            user.setEmail("age001@gmail.com");
            user.setUserAccount(createAgencyOperatorUserAccount());
            userService.create(user);
        }
    }

    private void createAgencyDirectorUser() {
        if (!userService.existsByEmail("dir001@gmail.com")) {
            User user = new User();
            user.setPhone("90030304");
            user.setFirstname("Directeur");
            user.setLastname("Directeur");
            user.setGender("MALE");
            user.setEmail("dir001@gmail.com");
            user.setUserAccount(createAgencyManagerUserAccount());
            userService.create(user);
        }
    }

    private void createGestionnaireUser(UserAccount userAccount) {
        if (!userService.existsByEmail("gestionnaire002@gmail.com")) {
            User user = new User();
            user.setPhone("90000125");
            user.setFirstname("AMENOUVEVE");
            user.setLastname("AKOFA");
            user.setGender("FEMALE");
            user.setEmail("gestionnaire002@gmail.com");
            user.setUserAccount(userAccount);
            userService.create(user);
        }
    }

    private void createManagerUser(UserAccount userAccount) {
        if (!userService.existsByEmail(managerUserProperties.getEmail())) {
            User user = userFrom(managerUserProperties);
            user.setUserAccount(userAccount);
            userService.create(user);
        }
    }

    private List<UserPermission> getPromotersPermissions() {
        return new ArrayList<UserPermission>(Arrays.asList(
                new UserPermission(UserPermissionConstant.CONSULT_CLIENT),
                new UserPermission(UserPermissionConstant.CONSULT_LOCALITY),
                new UserPermission(UserPermissionConstant.CONSULT_CREDIT),
                new UserPermission(UserPermissionConstant.CONSULT_TONTINE),
                new UserPermission(UserPermissionConstant.CONSULT_ACCOUNT),
                new UserPermission(UserPermissionConstant.PROMOTER),
                new UserPermission(UserPermissionConstant.EDIT_CREDIT),
                new UserPermission(UserPermissionConstant.EDIT_TONTINE),
                new UserPermission(UserPermissionConstant.CONSULT_DASHBOARD),
                new UserPermission(UserPermissionConstant.OPEN_CASH_DESK),
                new UserPermission(UserPermissionConstant.CLOSE_CASH_DESK),
                new UserPermission(UserPermissionConstant.CONSULT_OPEN_ACCOUNTING_DAY)
                ));
    }

    private List<UserPermission> getTestPermissions() {
        return new ArrayList<UserPermission>(Arrays.asList(
                new UserPermission(UserPermissionConstant.CONSULT_LOCALITY),
                new UserPermission(UserPermissionConstant.CONSULT_CREDIT),
                new UserPermission(UserPermissionConstant.CONSULT_TONTINE),
                new UserPermission(UserPermissionConstant.CONSULT_ACCOUNT),
                new UserPermission(UserPermissionConstant.PROMOTER),
                new UserPermission(UserPermissionConstant.EDIT_CREDIT),
                new UserPermission(UserPermissionConstant.EDIT_TONTINE),
                new UserPermission(UserPermissionConstant.CONSULT_DASHBOARD),
                new UserPermission(UserPermissionConstant.OPEN_CASH_DESK),
                new UserPermission(UserPermissionConstant.CLOSE_CASH_DESK),
                new UserPermission(UserPermissionConstant.CONSULT_OPEN_ACCOUNTING_DAY)
        ));
    }

    private List<UserPermission> getStoreKeeperPermissions() {
        return new ArrayList<UserPermission>(List.of(
                new UserPermission(UserPermissionConstant.STOREKEEPER),
                new UserPermission(UserPermissionConstant.STOREKEEPER_DASHBOARD)
        ));
    }

    private List<UserPermission> getAgencyReportPermissions() {
        return new ArrayList<UserPermission>(Arrays.asList(
                new UserPermission(UserPermissionConstant.AGENCY_REPORT_CONSULT),
                new UserPermission(UserPermissionConstant.AGENCY_REPORT_EDIT),
                new UserPermission(UserPermissionConstant.AGENCY_REPORT_DEL)
        ));
    }

    private List<UserPermission> getAgencyDepositPermissions() {
        List<UserPermission> depositPermissions = new ArrayList<UserPermission>(getAgencyReportPermissions());
        depositPermissions.addAll(List.of(new UserPermission(UserPermissionConstant.AGENCY_DEPOSIT_CONSULT),
                new UserPermission(UserPermissionConstant.AGENCY_DEPOSIT_EDIT),
                new UserPermission(UserPermissionConstant.AGENCY_DEPOSIT_DEL)));
        return depositPermissions;
    }

    private List<UserPermission> getManagerPermissions() {
        List<UserPermission> managersPermissions = new ArrayList<UserPermission>(getPromotersPermissions());
        managersPermissions.addAll(Arrays.asList(new UserPermission(UserPermissionConstant.EDIT_ARTICLE),
                new UserPermission(UserPermissionConstant.EDIT_ACCOUNT),
                new UserPermission(UserPermissionConstant.EDIT_CLIENT),
                new UserPermission(UserPermissionConstant.EDIT_CLIENT),
                new UserPermission(UserPermissionConstant.EDIT_USER),
                new UserPermission(UserPermissionConstant.OPEN_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.CLOSE_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.EDIT_LOCALITY),
                new UserPermission(UserPermissionConstant.SHOW_PURCHASE_PRICE),
                new UserPermission(UserPermissionConstant.DEL_USER),
                new UserPermission(UserPermissionConstant.CONSULT_USER),
                new UserPermission(UserPermissionConstant.DEL_ACCOUNT),
                new UserPermission(UserPermissionConstant.DEL_ARTICLE),
                new UserPermission(UserPermissionConstant.DEL_CLIENT),
                new UserPermission(UserPermissionConstant.DEL_CREDIT),
                new UserPermission(UserPermissionConstant.DEL_LOCALITY),
                new UserPermission(UserPermissionConstant.DEL_PROMOTER),
                new UserPermission(UserPermissionConstant.DEL_TONTINE),
                new UserPermission(UserPermissionConstant.REPORT),
                new UserPermission(UserPermissionConstant.STOREKEEPER_DASHBOARD)
        ));
        return managersPermissions;
    }

    private List<UserPermission> getRootPermissions() {
        List<UserPermission> rootPermissions = new ArrayList<UserPermission>(getManagerPermissions());
        rootPermissions.add(new UserPermission(UserPermissionConstant.SU));
        rootPermissions.addAll(getGestionnairePermissions());
        rootPermissions.addAll(getAgencyDepositPermissions());
        rootPermissions.addAll(getStoreKeeperPermissions());
        return rootPermissions;
    }

    private List<UserPermission> getGestionnairePermissions() {
        List<UserPermission> gestionnairePermissions = new ArrayList<UserPermission>(getPromotersPermissions());
        gestionnairePermissions.addAll(Arrays.asList(new UserPermission(UserPermissionConstant.EDIT_ARTICLE),
                new UserPermission(UserPermissionConstant.EDIT_ACCOUNT),
                new UserPermission(UserPermissionConstant.EDIT_CLIENT),
                new UserPermission(UserPermissionConstant.OPEN_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.CLOSE_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.EDIT_LOCALITY),
                new UserPermission(UserPermissionConstant.SHOW_PURCHASE_PRICE),
                new UserPermission(UserPermissionConstant.DEL_ACCOUNT),
                new UserPermission(UserPermissionConstant.DEL_CLIENT),
                new UserPermission(UserPermissionConstant.DEL_CREDIT),
                new UserPermission(UserPermissionConstant.DEL_LOCALITY),
                new UserPermission(UserPermissionConstant.CONSULT_DASHBOARD),
                new UserPermission(UserPermissionConstant.START_CREDIT),
                new UserPermission(UserPermissionConstant.VALIDATE_CREDIT),
                new UserPermission(UserPermissionConstant.DEL_TONTINE),
                new UserPermission(UserPermissionConstant.REPORT),
                new UserPermission(UserPermissionConstant.STOREKEEPER_DASHBOARD),
                new UserPermission(UserPermissionConstant.CREATE_INVENTORY),
                new UserPermission(UserPermissionConstant.RECONCILE_INVENTORY),
                new UserPermission(UserPermissionConstant.FINALIZE_INVENTORY)
        ));
        return gestionnairePermissions;
    }

    private List<UserPermission> getSecretaryPermissions() {
        List<UserPermission> gestionnairePermissions = new ArrayList<UserPermission>(getPromotersPermissions());
        gestionnairePermissions.addAll(Arrays.asList(new UserPermission(UserPermissionConstant.EDIT_ARTICLE),
                new UserPermission(UserPermissionConstant.EDIT_ACCOUNT),
                new UserPermission(UserPermissionConstant.EDIT_CLIENT),
                new UserPermission(UserPermissionConstant.OPEN_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.CLOSE_ACCOUNTING_DAY),
                new UserPermission(UserPermissionConstant.EDIT_LOCALITY),
                new UserPermission(UserPermissionConstant.SHOW_PURCHASE_PRICE),
                new UserPermission(UserPermissionConstant.DEL_LOCALITY),
                new UserPermission(UserPermissionConstant.CONSULT_DASHBOARD),
                new UserPermission(UserPermissionConstant.STOREKEEPER_DASHBOARD)
        ));
        return gestionnairePermissions;
    }

    private User userFrom(RootUserProperties properties) {
        return getUser(properties.getEmail(), properties.getFirstname(), properties.getLastname(), properties.getGender(), properties.getPhone());
    }

    private User userFrom(ManagerUserProperties properties) {
        return getUser(properties.getEmail(), properties.getFirstname(), properties.getLastname(), properties.getGender(), properties.getPhone());
    }

    public List<User> getPromoters() {
        return userService.getByUserProfil(UserProfilConstant.PROMOTER);
    }

    private User getUser(String email, String firstname, String lastname, String gender, String phone) {
        User user = new User();
        user.setEmail(email);
        user.setFirstname(firstname);
        user.setLastname(lastname);
        user.setGender(gender);
        user.setPhone(phone);
        return user;
    }
}
