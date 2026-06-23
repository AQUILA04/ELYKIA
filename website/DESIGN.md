---
name: Arctic Professional
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#73777f'
  outline-variant: '#c3c6cf'
  surface-tint: '#436086'
  primary: '#244267'
  on-primary: '#ffffff'
  primary-container: '#3d5a80'
  on-primary-container: '#b4d1fe'
  inverse-primary: '#abc8f4'
  secondary: '#4a6364'
  on-secondary: '#ffffff'
  secondary-container: '#cde8e9'
  on-secondary-container: '#50696a'
  tertiary: '#1a4559'
  on-tertiary: '#ffffff'
  tertiary-container: '#345d72'
  on-tertiary-container: '#abd5ed'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e3ff'
  primary-fixed-dim: '#abc8f4'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#2a486d'
  secondary-fixed: '#cde8e9'
  secondary-fixed-dim: '#b1cbcd'
  on-secondary-fixed: '#051f20'
  on-secondary-fixed-variant: '#334b4c'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#a3cce4'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#214b60'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  ice-white: '#FFFFFF'
  deep-navy: '#3D5A80'
  glacier-blue: '#E0FBFC'
  success-mint: '#A8DADC'
  error-coral: '#EE6C4D'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is engineered for a professional food finance context, blending the reliability of traditional banking with the agility of modern fintech. The "Arctic Professional" aesthetic utilizes a high-clarity, cool-toned palette to evoke transparency and precision. 

The style integrates **Minimalism** with subtle **Glassmorphism**. Layouts prioritize generous whitespace and a "breathable" interface to reduce cognitive load during financial transactions. Key visual drivers include:
- **Clarity:** A focus on legibility and data visualization.
- **Trust:** A structured, stable grid system that feels established.
- **Modernity:** The use of translucent frosted layers and soft, ambient shadows to create a sense of depth without clutter.

## Colors

The palette is rooted in an "Arctic" spectrum. The background utilizes a crisp off-white (#F7F9FB) to prevent screen fatigue while maintaining a premium feel. 

- **Primary (Deep Navy):** Reserved for high-level typography, primary actions, and brand iconography. It provides the "anchor" for the visual identity.
- **Secondary (Glacier Blue):** Used for large surface areas, subtle highlights, and background accents.
- **Tertiary:** A bridge between the deep navy and glacier blue, ideal for secondary buttons or active states.
- **Status Colors:** Success and error states are muted to remain cohesive with the cool-toned palette, ensuring alerts are noticeable but not aggressive.

## Typography

The design system exclusively uses **Plus Jakarta Sans** to achieve a contemporary, approachable, yet authoritative feel. 

The type hierarchy is designed for high-density financial information. Headlines use tighter letter-spacing and heavier weights to command attention, while body text maintains a generous line height (1.6x) for maximum readability. Labels are frequently used in uppercase with slight tracking to differentiate metadata from primary content.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop and a **Fluid** model for mobile.

- **Desktop:** A 12-column grid centered in a 1280px container.
- **Tablet:** An 8-column grid with 32px side margins.
- **Mobile:** A 4-column grid with 20px side margins.

The spacing rhythm is based on a **8px base unit**. All padding, margins, and component heights must be multiples of 8 (e.g., 8, 16, 24, 32, 48, 64). Use larger gaps (48px+) between major sections to emphasize the "Arctic" sense of vastness and clarity.

## Elevation & Depth

This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Glassmorphism**.

1.  **Level 0 (Base):** Off-white (#F7F9FB) surface.
2.  **Level 1 (Cards/Content):** Pure white (#FFFFFF) with a very soft, diffused shadow (Blur: 20px, Y: 4px, Opacity: 4% Navy).
3.  **Level 2 (Glass Overlays):** Semi-transparent Glacier Blue (#E0FBFC at 60% opacity) with a 12px Backdrop Blur. This is used for navigation bars and floating action panels.
4.  **Level 3 (Modals/Popovers):** Pure white with a crisp 1px border (#E0FBFC) and a medium ambient shadow (Blur: 40px, Y: 8px, Opacity: 8% Navy).

## Shapes

The shape language is "Soft-Modern." A consistent corner radius of 0.5rem (8px) is applied to standard UI elements like input fields and small buttons. Larger containers and cards use a 1rem (16px) radius to feel more approachable and less "industrial." 

Interactive elements should never have sharp corners, reinforcing the friendly yet professional brand persona.

## Components

- **Buttons:** Primary buttons are solid Deep Navy with white text. Secondary buttons use a Glacier Blue fill with Deep Navy text. All buttons feature a subtle transition on hover, slightly increasing the shadow depth.
- **Input Fields:** Use a white background with a 1px border in Glacier Blue. On focus, the border shifts to Deep Navy with a soft outer glow.
- **Cards:** White surfaces with a 16px radius. For financial data, use a "Glass" variant card—a semi-transparent Glacier Blue fill with a 1px white stroke to denote a premium or highlighted status.
- **Chips/Badges:** Small, pill-shaped elements with a secondary color background and Deep Navy labels. These are used for transaction categories (e.g., "Logistics," "Harvest").
- **Lists:** Transaction lists should be clean, with thin horizontal dividers (#E0FBFC) and generous vertical padding (16px).
- **Data Visualization:** Use the primary and tertiary colors for charts, ensuring high contrast against the off-white background.