package com.example.notification_service.service;

import com.example.notification_service.exception.TemplateRenderException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TemplateRenderer {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([A-Za-z][A-Za-z0-9_]*)\\s*}}");

    public String render(String template, Map<String, ?> variables) {
        return renderTemplate(template, variables, false);
    }

    public String renderHtml(String template, Map<String, ?> variables) {
        return renderTemplate(template, variables, true);
    }

    private String renderTemplate(String template, Map<String, ?> variables, boolean escapeHtml) {
        if (template == null) {
            throw new TemplateRenderException("Template must not be null");
        }
        String templateStructure = VARIABLE.matcher(template).replaceAll("");
        if (templateStructure.contains("{{") || templateStructure.contains("}}")) {
            throw new TemplateRenderException("Template contains an invalid variable expression");
        }

        Map<String, ?> values = variables == null ? Map.of() : variables;
        Matcher matcher = VARIABLE.matcher(template);
        StringBuffer rendered = new StringBuffer();
        Set<String> missingVariables = new LinkedHashSet<>();

        while (matcher.find()) {
            String name = matcher.group(1);
            Object value = values.get(name);
            if (value == null) {
                missingVariables.add(name);
                matcher.appendReplacement(rendered, Matcher.quoteReplacement(matcher.group()));
                continue;
            }

            String replacement = value.toString();
            if (escapeHtml) {
                replacement = escapeHtml(replacement);
            }
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(rendered);

        if (!missingVariables.isEmpty()) {
            throw new TemplateRenderException(
                    "Missing template variables: " + String.join(", ", missingVariables)
            );
        }
        return rendered.toString();
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
