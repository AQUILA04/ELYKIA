# Mobile Architecture

## Executive Summary
The Mobile App is a hybrid application built with Ionic and Angular, designed for field agents. It supports offline operations and synchronizes data with the backend.

## Technology Stack
*   **Framework:** Ionic 8, Angular 20
*   **Runtime:** Capacitor 7
*   **Language:** TypeScript
*   **Local Database:** SQLite
*   **State Management:** NgRx (Store, Effects)

## Architecture Pattern
**Hybrid Mobile Architecture with Offline-First Strategy**
*   **UI Layer:** Ionic Components (Adaptive to iOS/Android).
*   **Logic Layer:** Angular Services and NgRx Store.
*   **Native Layer:** Capacitor Plugins (Camera, Geolocation, Filesystem).
*   **Data Layer:** SQLite for local persistence.

## Key Features
*   **Offline Sync:** Custom synchronization engine to queue offline actions and sync when online.
*   **Tontine Operations:** Collection and member management in the field.
*   **Order Taking:** Creating orders offline.
*   **Printing:** Bluetooth printing support.

## Data Architecture
*   **Local:** SQLite database mirroring a subset of the backend schema.
*   **Remote:** REST API synchronization.
