//package com.optimize.common.securities.config;
//
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.web.filter.CommonsRequestLoggingFilter;
//
//@Configuration
//public class RequestLoggingFilterConfig {
//
//    @Bean
//    public CommonsRequestLoggingFilter logFilter() {
//        CommonsRequestLoggingFilter filter
//                = new CommonsRequestLoggingFilter();
//        filter.setIncludeQueryString(true);
//        filter.setIncludePayload(true);
//        filter.setMaxPayloadLength(100500);
//        filter.setIncludeHeaders(false);
//        filter.setBeforeMessagePrefix("REQ DATA : ");
//        filter.setAfterMessagePrefix("RESP DATA : ");
//        return filter;
//    }
//}
