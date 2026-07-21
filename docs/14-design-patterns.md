# 14 - Design Patterns

# Rallies Design System & UI Guidelines

**Version:** 1.0

**Status:** Source of Truth

---

# Purpose

This document defines the visual language and UI principles of Rallies.

It must be followed by every developer and AI programming agent.

The objective is to create a product that feels:

- modern
- lightweight
- premium
- sports-oriented
- consistent
- accessible
- mobile-first

Visual consistency is more important than creativity.

When in doubt, reuse existing patterns instead of inventing new ones.

---

# Design Philosophy

Rallies is not a corporate dashboard.

It is a social platform built around table tennis.

The interface should communicate:

- speed
- precision
- focus
- competition
- community

The UI should never feel:

- noisy
- overly playful
- childish
- excessively futuristic
- overloaded with colors
- overloaded with animations

Think of products like:

- Linear
- GitHub
- Vercel
- Notion
- Discord
- Chess.com

Clean interfaces.
Strong hierarchy.
Minimal distractions.

---

# Design Principles

## Mobile First

Every screen must be designed for mobile before desktop.

Desktop layouts should expand naturally instead of becoming entirely different pages.

---

## Minimalism

Remove anything that doesn't improve usability.

Every component should have a purpose.

Avoid decorative elements that don't provide value.

---

## Consistency

The same interaction should always look and behave the same way.

Buttons, cards, badges, dialogs and forms should never have multiple visual styles without reason.

---

## Accessibility

Accessibility is mandatory.

Follow WCAG AA whenever possible.

Always ensure:

- readable font sizes
- sufficient color contrast
- visible keyboard focus
- semantic HTML
- accessible forms
- accessible dialogs

---

# Theme

## Default Theme

Dark.

Dark mode is the default experience.

Light mode may be added in the future but should not influence current development.

Do not rely on the user's operating system preference.

---

# Color Palette

## Primary

Blue.

The primary color represents:

- interaction
- active states
- navigation
- confirmations requiring attention

Use a modern medium-blue.

Avoid neon blue.

---

## Secondary

Dark neutral surfaces.

Secondary colors should never compete with the primary blue.

---

## Success

Green.

Reserved for:

- successful actions
- completed operations
- confirmations

---

## Warning

Amber.

Reserved for:

- warnings
- pending actions
- recoverable issues

---

## Danger

Red.

Reserved only for:

- destructive actions
- errors
- irreversible operations

Never use red as decoration.

---

# Surface Hierarchy

There should be three main visual layers.

## Background

Darkest color.

Entire application background.

---

## Surface

Cards.

Panels.

Dialogs.

Containers.

Slightly lighter than the background.

---

## Elevated Surface

Dropdowns.

Popovers.

Menus.

Floating panels.

Slightly brighter than standard surfaces.

---

# Typography

Use a clean sans-serif font.

Recommended:

Geist

Fallback:

Inter

Font hierarchy:

H1

Large page titles.

H2

Section titles.

H3

Card titles.

Body

Normal content.

Caption

Supporting information.

Avoid excessive font sizes.

Whitespace creates hierarchy better than giant typography.

---

# Spacing

Use an 8px spacing system.

Examples:

4

8

12

16

24

32

48

64

Do not create arbitrary spacing values.

---

# Border Radius

Small.

Modern.

Recommended:

Buttons

8px

Cards

12px

Dialogs

16px

Avoid exaggerated rounded corners.

---

# Shadows

Use subtle shadows.

The interface should feel layered, not floating.

Avoid large blurred shadows.

---

# Icons

Use Lucide icons.

Do not mix icon libraries.

Icons should support content, not replace labels.

---

# Buttons

There should be a clear hierarchy.

## Primary

Blue.

Main action.

One per section whenever possible.

---

## Secondary

Neutral.

Alternative action.

---

## Outline

Low emphasis.

---

## Ghost

Toolbar actions.

Navigation.

---

## Destructive

Red.

Reserved for destructive operations.

---

# Forms

Forms should be:

simple

predictable

vertically aligned

comfortable on mobile

Requirements:

clear labels

validation messages

help text when necessary

required indicators

disabled state

loading state

Never rely only on placeholders.

---

# Cards

Cards are one of the primary UI patterns.

Used for:

clubs

events

matches

profiles

wallet

Cards should have:

title

optional image

metadata

primary action

secondary actions when appropriate

Consistent padding.

Consistent spacing.

---

# Navigation

Navigation should always prioritize mobile.

Desktop navigation should reuse the same information architecture.

Avoid duplicated navigation systems.

---

# Lists

Large datasets should use:

filters

sorting

pagination or infinite scrolling

search

Avoid endless scrolling without organization.

---

# Tables

Only use tables when comparing structured information.

Never use tables on small mobile screens.

Prefer responsive cards.

---

# Dialogs

Dialogs should be focused.

One primary objective.

Avoid nested dialogs.

Avoid long forms inside dialogs.

---

# Feedback

Every user action should generate feedback.

Examples:

loading

success

error

empty state

Skeletons are preferred over spinners for page loading.

---

# Empty States

Every empty state should explain:

what happened

why

what the user can do next

Never leave blank pages.

---

# Loading

Prefer skeleton components.

Avoid blocking the entire interface.

Progressive rendering is preferred.

---

# Animations

Animations should be subtle.

Recommended:

150–250ms

Use animation only to improve understanding.

Avoid decorative animations.

---

# Responsiveness

Breakpoints should be content-driven.

Every screen must work on:

mobile

tablet

desktop

No horizontal scrolling.

---

# Images

Optimize images.

Lazy-load whenever appropriate.

Always define aspect ratios.

Avoid layout shifts.

---

# Component Rules

Build reusable components only after repetition appears.

Avoid premature abstraction.

Prefer composition over inheritance.

Follow shadcn/ui patterns.

Never modify shadcn components directly.

Wrap or compose them instead.

---

# AI Development Rules

When generating UI:

Always reuse existing components.

Never introduce a second design language.

Never create duplicate button styles.

Never invent new spacing systems.

Never introduce additional color palettes.

Never hardcode colors if design tokens exist.

Always use theme tokens.

Always prioritize responsiveness.

Always keep accessibility in mind.

Always preserve visual consistency.

If a new component resembles an existing one, extend the existing pattern instead of creating another.

---

# Visual Identity

The platform should communicate:

Competition.

Community.

Performance.

Organization.

Professionalism.

The user should feel that the application is reliable enough to manage real tournaments, clubs and personal match history.

The interface should feel calm and focused, allowing the sport itself to be the center of attention.

---

# Definition of Done (UI)

A UI implementation is only considered complete if:

- It follows the design system.
- It is responsive.
- It works in dark mode.
- It uses theme tokens.
- It supports localization.
- It has proper loading states.
- It has proper empty states.
- It has proper error states.
- It is accessible.
- It reuses existing components whenever possible.
- It introduces no unnecessary visual patterns.