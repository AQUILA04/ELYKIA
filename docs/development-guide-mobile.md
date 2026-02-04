# Mobile Development Guide

## Prerequisites
*   **Node.js:** v18.x or v20.x
*   **NPM:** v8+
*   **Ionic CLI:** v7+
*   **Angular CLI:** v20.0.0
*   **Android Studio:** For Android development
*   **Xcode:** For iOS development

## Setup & Installation

1.  **Navigate to mobile directory:**
    ```bash
    cd ELYKIA/mobile
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

*   **Serve in Browser:**
    ```bash
    ionic serve
    ```
*   **Run on Android:**
    ```bash
    ionic cap run android -l --external
    ```
*   **Run on iOS:**
    ```bash
    ionic cap run ios -l --external
    ```

## Building

*   **Build for Production:**
    ```bash
    ng build
    ```

## Testing

*   **Run Unit Tests:**
    ```bash
    ng test
    ```
