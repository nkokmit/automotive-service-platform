package com.example.work_order_service.exception;

import com.example.work_order_service.common.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SecurityErrorHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void authenticationEntryPointReturnsUnauthorizedApiResponse() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        CustomAuthenticationEntryPoint entryPoint = new CustomAuthenticationEntryPoint(objectMapper);

        entryPoint.commence(
                new MockHttpServletRequest(),
                response,
                new BadCredentialsException("Invalid token"));

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertEquals(StandardCharsets.UTF_8.name(), response.getCharacterEncoding());
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        assertEquals(ApiResponse.error(ErrorCode.UNAUTHENTICATED.getCode(),
                        ErrorCode.UNAUTHENTICATED.getMessage()),
                objectMapper.readValue(response.getContentAsByteArray(), ApiResponse.class));
    }
}
