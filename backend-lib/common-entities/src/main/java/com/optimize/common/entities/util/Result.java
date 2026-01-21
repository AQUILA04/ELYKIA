package com.optimize.common.entities.util;

import java.util.Optional;

public class Result<T> {
        private final Optional<T> value;
        private final Optional<String> error;

        private Result(T value, String error) {
            this.value = Optional.ofNullable(value);
            this.error = Optional.ofNullable(error);
        }

        public static <U> Result<U> ok(U value) {
            return new Result<>(value, null);
        }

        public static <U> Result<U> error(String error) {
            return new Result<>(null, error);
        }

        public boolean isError() {
            return error.isPresent();
        }

        public T getValue() {
            return value.orElse(null);
        }

        public String getError() {
            return error.orElse("");
        }
}
