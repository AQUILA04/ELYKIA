package com.optimize.common.entities.util;

import jakarta.xml.bind.DatatypeConverter;
import org.springframework.util.StringUtils;



public class Converter {

    private Converter() {
        // Default constructor
    }

    public static byte[] convertToByteImage(String base64Image) {
        if(StringUtils.hasText(base64Image) && base64Image.contains(";base64,") && (base64Image.indexOf(",") == 21 || base64Image.indexOf(",") == 22)  && base64Image.length() > 1040) {
            return DatatypeConverter.parseBase64Binary(base64Image.split(",")[1]);
        }else if (StringUtils.hasText(base64Image) && base64Image.length() > 1040) {
            return DatatypeConverter.parseBase64Binary(base64Image);
        }else {
            return new byte[0];
        }
    }

}
