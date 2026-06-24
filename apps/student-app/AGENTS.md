# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Duetto Mobile UI Guide

Use this style for all new screens and refactors in student-app:

- Visual direction: clean editorial cards over a soft blue-gray background (`#eef3f8`), deep navy hero surfaces (`#0f2742`), and sky-blue action accents.
- Surface system:
	- Page background: `#eef3f8`
	- Primary card: white with subtle border `#dbe4ef` and rounded corners 14-20
	- Hero card: dark navy with light text and soft shadow
- Typography:
	- Primary heading: bold, high contrast (`#0f172a` or `#f8fafc` on dark)
	- Supporting text: slate tones (`#64748b`, `#475569`)
	- Avoid plain default text styling.
- Buttons:
	- Primary button: solid blue (`#0369a1` to `#0284c7`), white bold text
	- Secondary button: cool gray background (`#e2e8f0`) with dark text
	- Disabled state: opacity reduction, keep shape and spacing.
- Inputs:
	- Filled light background (`#f8fafc`) with border `#dbe4ef`
	- Radius 12, minimum height around 52
	- Consistent label above each input.
- Layout rhythm:
	- Use grouped sections/cards with 12-18 spacing
	- Prefer segmented controls/tabs for multi-section pages
	- Keep major actions visible without excessive scrolling.
- Navigation chrome:
	- Prefer custom in-page headers for key workflow pages when default header wastes vertical space.
	- Provide an explicit back action in the page header area.

When editing existing screens, preserve behavior and API flow while updating visual language to match this guide.

## Challenge-Detail Baseline (Reference Spec)

Use apps/teacher-app/app/dashboard/challenge-detail.tsx as the visual source of truth for shared mobile page structure.

- Background and page shell:
	- Safe area/page background must use `#eef3f8`.
	- Page content should use outer padding around `16` and vertical rhythm in the `12-16` range.
- Header pattern (custom in-page header, not default navigator header):
	- First surface is a dark hero card (`#0f2742`) with radius near `20`, padding near `18`, and soft elevation/shadow.
	- Back button belongs inside the hero top row, aligned horizontally with the page title.
	- Back button styling should be pill shape (`borderRadius: 999`) with light blue translucent background and border.
	- Keep title in the same row as back button and keep subtitle/eyebrow below.
- Color system:
	- Primary dark text: `#0f172a`
	- Supporting text: `#64748b` / `#475569`
	- Card border: `#dbe4ef`
	- Primary action: `#0369a1`
	- Secondary action: `#e2e8f0` with dark text
	- Hero text accents: `#f8fafc`, `#cbd5e1`, `#93c5fd`
- Card and section spacing:
	- Main content uses stacked cards with radius `14-16` and border `#dbe4ef`.
	- Use compact but clear internal gaps (`6`, `10`, `12`, `14`) instead of large empty spacing.
	- Keep tab containers segmented with subtle background (`#dbe4ef`) and active white segment.
- Inputs and buttons:
	- Inputs use `#f8fafc` fill, `#dbe4ef` border, radius `12`, min height around `52`.
	- Primary buttons are blue with bold white text; secondary buttons are gray with dark text.
	- Disabled buttons should reduce opacity only.
- Back button location rule:
	- For workflow/detail screens, place the back button in the top-left of the custom hero/header row.
	- Do not place back button below title or as a floating element outside the header row.
