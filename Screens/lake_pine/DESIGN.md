---
name: Lake & Pine
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444840'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#75786f'
  outline-variant: '#c5c8bd'
  surface-tint: '#536346'
  primary: '#455538'
  on-primary: '#ffffff'
  primary-container: '#5d6d4f'
  on-primary-container: '#dceec9'
  inverse-primary: '#bbcca9'
  secondary: '#805533'
  on-secondary: '#ffffff'
  secondary-container: '#fdc39a'
  on-secondary-container: '#794e2e'
  tertiary: '#52504c'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a6863'
  on-tertiary-container: '#ece8e2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e8c3'
  primary-fixed-dim: '#bbcca9'
  on-primary-fixed: '#121f08'
  on-primary-fixed-variant: '#3c4b30'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#f4bb92'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#653d1e'
  tertiary-fixed: '#e6e2dc'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#484742'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  headline-lg:
    fontFamily: DM Sans
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style

The design system is rooted in the philosophy of "Lagom"—just enough. It captures the essence of a lakeside retreat in Masuria by blending Scandinavian functionalism with the organic warmth of the Polish landscape. The aesthetic is premium yet unpretentious, aiming to evoke a sense of quietude and breathability.

The style is **Minimalist with Tactile accents**. It prioritizes high-quality nature photography as a structural element rather than decoration. Whitespace is used aggressively to reduce cognitive load, reflecting the mental clarity one seeks during a vacation. UI elements are understated, using subtle transitions and organic textures to create a sophisticated, hospitable atmosphere.

## Colors

The palette is derived directly from the Masurian environment. The primary **Forest Green** serves as the anchor for call-to-action elements and navigation highlights, representing the surrounding woods. The **Wood Tone** is used sparingly for accents, providing warmth against the cooler neutral tones.

The foundation of the interface is built on **Off-White (#FAF9F6)** and **Warm Gray** surfaces to avoid the clinical feel of pure white. This creates a "paper-like" quality that feels premium and tactile. Text is rendered in a deep, softened charcoal rather than pure black to maintain a gentle contrast ratio that is easy on the eyes during evening browsing.

## Typography

This design system utilizes **DM Sans** for its geometric clarity and contemporary warmth. The typographic hierarchy is intentionally flat to maintain a minimalist look, using weight and letter spacing rather than massive size differentials to establish order.

Headlines should be set with tight tracking and generous line height to feel like editorial titles. Body text is optimized for long-form reading about amenities and local history, featuring an increased line height (1.6) to enhance the feeling of "openness" within the layout. Labels use an uppercase treatment with wider tracking to provide a structural contrast to the fluid body copy.

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop to ensure content remains centered and curated, mirroring the focus of a boutique hotel experience. On mobile, it shifts to a fluid 4-column system.

- **Vertical Rhythm:** A strict 8px baseline grid governs all components.
- **Sectioning:** Large gaps (120px+) are used between major content blocks (e.g., between the Hero and the Gallery) to create a "gallery" feel where each section has room to breathe.
- **Containment:** Content is housed in wide containers with generous internal padding, ensuring that text never feels crowded by the edges of the screen or adjacent imagery.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** rather than traditional shadows. Surfaces use subtle shifts in background color (e.g., moving from an off-white page to a slightly warmer gray card) to indicate hierarchy.

Where depth is required for interactivity (like a booking modal or a floating action button), use **Ambient Shadows**. These should be highly diffused, using the primary forest green color at a very low opacity (5-8%) instead of black, creating a "glow" that feels natural and integrated with the environment. High-contrast outlines in 1px width are preferred over heavy shadows for secondary containers.

## Shapes

The shape language is defined by **Softened Geometry**. A base radius of 8px (Level 2) is applied to most interactive elements to remove the "sharpness" of digital interfaces, making the UI feel more approachable and organic.

Larger components, such as image containers and featured cards, should utilize the `rounded-xl` (24px) setting to create a friendly, nested appearance. Circular shapes are reserved exclusively for utility icons and specific status indicators to maintain the sophisticated architectural feel of the overall design.

## Components

### Buttons
Buttons are minimalist and flat. The primary button uses the Forest Green background with white text, featuring 16px vertical and 32px horizontal padding. The secondary button is a "Ghost" style with a 1px Wood Tone border, emphasizing a light, non-obstructive footprint.

### Cards
Amenity and room cards use a "borderless" style. They rely on the `rounded-xl` image at the top and the `body-lg` typography below. Content is separated by generous whitespace rather than lines.

### Calendar Interface
The booking calendar is the most complex component. It uses a custom monochromatic treatment: active dates are highlighted with a soft Forest Green circle, while unavailable dates are rendered in a light gray with a strike-through. The interface avoids heavy borders, using a simple grid of numbers.

### Seasonal Pricing Tables
Pricing is presented in a clean, row-based list. Seasonal headers use the `label-caps` style. Subtle 1px dividers in a warm gray separate the rows to maintain legibility without adding visual weight.

### Inputs
Form fields are minimal under-lined or lightly boxed inputs with a 1px border that shifts to Forest Green on focus. Labels always float above the input to ensure the layout remains stable during interaction.