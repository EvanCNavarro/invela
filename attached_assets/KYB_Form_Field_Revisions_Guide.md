# 📘 KYB Form Field Revisions — AI Contextual Guide

## ✅ Purpose

This document provides a structured and annotated reference for understanding updates to the **Know Your Business (KYB)** onboarding form. It is designed specifically for use by an AI agent working on form generation, schema updates, or front-end mapping tasks.

All field definitions, proposed edits, additions, and removals are cataloged in a file named:

**`KYB_Form_Field_Revisions_vFinal.csv`**

---

## 📄 What This File Contains

This CSV contains a complete view of every KYB field, pulled from the original system and annotated with:

- Action to take (`ADD`, `EDIT`, `DELETE`, `NO CHANGE`)
- Mapping between current and proposed field definitions
- Position in the KYB user flow
- Metadata to drive schema-aware and context-sensitive generation

Each row represents one question or field, showing both what exists and what’s being proposed.

---

## 📊 Column Breakdown

| Column | Description |
|--------|-------------|
| `Action` | One of: `ADD`, `EDIT`, `DELETE`, or `NO CHANGE`. Tells the AI how to treat the field. |
| `Field Key (field_key)` | Unique key used in the backend or form schema. |
| `Display Name (display_name)` | Label typically shown in the form UI. |
| `Old Question (question)` | The current question text from the system. |
| `New Question Proposal` | A proposed new version of the question. If blank, the old version should remain. |
| `Old Id (id)` / `Old Order (order)` | Current backend identifiers for each field. |
| `New Id Proposal` / `New Order Proposal` | Updated identifiers and layout sequence for the field. |
| `Old Group (group)` / `New Group Proposal` | Indicates current and revised grouping (e.g., companyProfile). |
| `KYB Form Step` | The specific step in the KYB onboarding process where this question appears. |
| `Field Type (field_type)` | The expected data type for the answer (`TEXT`, `EMAIL`, `BOOLEAN`, etc). |
| `Required (required)` | Boolean flag — currently all values are `True`. |
| Other fields like `Validation Rules`, `Help Text`, and timestamps are included for context only. |

---

## 🧠 Instructions for AI Agent

1. **Use `Field Key (field_key)`** as the unique identifier for each field.
2. Respect the `Action` column to determine what to do:
   - `ADD`: Create a new field using all the metadata provided.
   - `EDIT`: Apply the differences shown in the “New” columns.
   - `DELETE`: Exclude the field from the new form but retain it for history.
   - `NO CHANGE`: Field remains as-is, no action required.
3. For fields marked `EDIT`, prioritize the value in `New Question Proposal` over the old.
4. Use `New Order Proposal` and `New Group Proposal` to determine **sequence and section placement**.
5. Ensure that field types and required flags are preserved.
6. Ignore timestamp metadata unless explicitly required.

---

## 📦 File Reference

The data described in this document is stored in:

### 📁 `KYB_Form_Field_Revisions_vFinal.csv`

This is the **source of truth** for any field-level updates to the KYB onboarding experience.

---

