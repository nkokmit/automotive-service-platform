package com.example.notification_service.service;

import com.example.notification_service.exception.TemplateRenderException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TemplateRendererTest {

    private final TemplateRenderer renderer = new TemplateRenderer();

    @Test
    void rendersHtmlAndEscapesVariableValues() {
        String rendered = renderer.renderHtml(
                "<p>Chào {{customerName}}</p>",
                Map.of("customerName", "<b>Alice & Bob</b>")
        );

        assertEquals("<p>Chào &lt;b&gt;Alice &amp; Bob&lt;/b&gt;</p>", rendered);
    }

    @Test
    void reportsAllMissingVariablesInsteadOfReturningUnresolvedPlaceholders() {
        TemplateRenderException exception = assertThrows(
                TemplateRenderException.class,
                () -> renderer.render("{{customerName}} {{bookingCode}}", Map.of())
        );

        assertEquals("Missing template variables: customerName, bookingCode", exception.getMessage());
    }

    @Test
    void rejectsMalformedPlaceholders() {
        assertThrows(TemplateRenderException.class,
                () -> renderer.render("Hello {{customer-name}}", Map.of()));
    }
}
