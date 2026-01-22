package com.optimize.common.entities.util;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

public class ApplicationContextProvider implements ApplicationContextAware {
    private static ApplicationContext context;

    public ApplicationContextProvider(ApplicationContext context) {
        this.setApplicationContext(context);
    }

    public static ApplicationContext getContext() {
        return context;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext)  {
        context = applicationContext;
    }
}
