# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js application hosted on Vercel. The roster remains a static JSON file, while attendance is stored as private Vercel Blob objects rather than in a database.

## Users

Guests check themselves in from their phones by entering their rostered name. A trusted event staff team uses one shared access code to monitor attendance.

## Product Purpose

Make event arrival feel quick and welcoming while giving staff an accurate, current attendance view.

## Positioning

A deliberately small, file-backed check-in system: the supplied roster is the source of truth and Vercel Blob keeps attendance durable without database administration.

## Operating Context

The app is used during a live event. Guests use their own mobile devices. Staff members view the dashboard separately. Vercel and its connected private Blob store provide the durable hosted runtime.

## Capabilities and Constraints

- Guests search the roster by name; batch is not part of guest check-in.
- A guest can be marked present only once; repeat attempts report that the person is already checked in.
- Staff access is protected by a shared code, not individual accounts.
- The roster is supplied as a static JSON file. Attendance is written as one immutable private Blob object per guest.
- V1 supports one active event and does not include roster editing, imports, exports, or identity verification.

## Brand Commitments

Warm and ceremonial, with a calm, occasion-worthy guest arrival experience.

## Evidence on Hand

No real guest list or brand assets have been provided. The implementation must use clearly labelled synthetic roster entries until the real list replaces them.

## Product Principles

- Make check-in feel certain, not bureaucratic.
- Never silently create duplicate attendance.
- Keep staff information legible at a glance.
- Prefer operational simplicity over unnecessary infrastructure.

## Accessibility & Inclusion

The guest flow must work on small touch screens and with keyboard navigation, readable labels, clear focus, and sufficient contrast.
