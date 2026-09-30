package com.travelagency.contractmanager.domain.enums;

/**
 * Visual contract entry statuses for Hotel Contract Manager.
 * - SAISI: Green badge with checkmark
 * - XML: Blue badge
 * - NON_SAISI: Red badge
 */
public enum EntryStatus {
    SAISI("Saisi", "success", "green"),
    XML("XML", "info", "blue"),
    NON_SAISI("Non Saisi", "danger", "red");

    private final String label;
    private final String badgeVariant;
    private final String badgeColor;

    EntryStatus(String label, String badgeVariant, String badgeColor) {
        this.label = label;
        this.badgeVariant = badgeVariant;
        this.badgeColor = badgeColor;
    }

    public String getLabel() {
        return label;
    }

    public String getBadgeVariant() {
        return badgeVariant;
    }

    public String getBadgeColor() {
        return badgeColor;
    }
}
