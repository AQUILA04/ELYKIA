package com.optimize.common.entities.util;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.util.StringUtils;


@Getter
@Setter
@NoArgsConstructor
public class SecureString {
    private String value;

    public SecureString(@NotBlank String str) {
        value  = secure(str);
    }

    private String secure(String str) {
        String s  = str.trim();
        if (StringUtils.containsWhitespace(s)) {
            s = StringUtils.replace(s, " ", "");
        }
        if (s.contains("=")){
            s = StringUtils.replace(s, "=", "");
        }
        if (s.contains(";")) {
            s = StringUtils.replace(s, ";", "");
        }
        return s;
    }

    public void setValue(String value) {
        this.value = secure(value);
    }
}
