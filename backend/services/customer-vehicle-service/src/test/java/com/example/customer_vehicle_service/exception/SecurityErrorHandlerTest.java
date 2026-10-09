package com.example.customer_vehicle_service.exception;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class SecurityErrorHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void authenticationEntryPointReturns401WithUtf8ApiResponse() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CustomAuthenticationEntryPoint().commence(
                new MockHttpServletRequest(), response, new BadCredentialsException("Invalid token"));

        assertErrorResponse(response, 401, ErrorCode.UNAUTHENTICATED);
    }

    @Test
    void accessDeniedHandlerReturns403WithUtf8ApiResponse() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CustomAccessDeniedHandler().handle(
                new MockHttpServletRequest(), response, new AccessDeniedException("Missing permission"));

        assertErrorResponse(response, 403, ErrorCode.UNAUTHORIZED);
    }

    private void assertErrorResponse(MockHttpServletResponse response, int status,
                                     ErrorCode errorCode) throws Exception {
        assertEquals(status, response.getStatus());
        assertEquals(StandardCharsets.UTF_8.name(), response.getCharacterEncoding());
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertEquals(errorCode.getCode(), body.get("code").asInt());
        assertEquals(errorCode.getMessage(), body.get("message").asString());
        assertFalse(body.has("result"));
    }
}
