# Elykia Mobile Brownfield Enhancement PRD

### **Section 1: Intro Project Analysis and Context (Existing System)**

#### **1.1 Existing Project Overview**

* **Analysis Source**: User-provided specifications, user stories, and implementation status documents (`user-stories.md`, `SYNC_IMPLEMENTATION_STATUS.md`, `TODO.md`).
* **Current Project State**: The project is an **existing Ionic/Angular mobile application** for field sales representatives. It integrates with a pre-existing backend and enables both online and offline operations. Key implemented features include:
    * **Hybrid Authentication**: Secure online/offline login.
    * **Data Initialization**: Initial sync of articles, clients, accounts, and stock outputs from the server.
    * **Core Field Operations**: Recording article distributions and daily collections (recoveries).
    * **Synchronization**: A robust synchronization feature is partially complete. The **automatic, sequential sync process is finished**, while the **manual, selective sync interface is currently in development**.
    * **Client Management**: Viewing client lists and details.
    * **Reporting**: Generating daily activity reports.
    * **Dashboard**: A dashboard provides key performance indicators for the sales rep.

#### **1.2 Available Documentation Analysis**

The project is well-documented. Key artifacts include:

* [✓] **Technical & Functional Specifications**: Detailed breakdown of features and rules.
* [✓] **Visual & Design Specifications**: Complete UI/UX design for 11 application screens.
* [✓] **User Stories**: A comprehensive set of user stories covering the initial development.
* [✓] **Database Schema**: A class diagram for the local SQLite database.
* [✓] **Implementation Plans**: Detailed `TODO.md` and status reports are available.

#### **1.3 Enhancement Scope Definition**

The immediate goal is to first **document the existing application** as described above. Subsequently, we will define the requirements for two major new Epics:

1.  **Order Management**: A new system for recording client orders without stock dependency.
2.  **Tontine Management**: A new module for managing client savings schemes (tontines).

* **Impact Assessment**: High Impact (These new features require significant development, including new backend services from scratch).

#### **1.4 Goals and Background Context (for New Epics)**

* **Goals**:
    * Expand the application's capabilities beyond simple distribution to include proactive order taking.
    * Introduce a new "Tontine" savings product to diversify the company's offerings and provide value to clients.
    * Develop the necessary backend services to support these new features, ensuring seamless integration with the existing system.
* **Background Context**: With the core distribution and collection functionalities established, the business now aims to broaden the application's scope. Order Management will allow sales reps to capture future sales, while Tontine Management introduces a new financial product, increasing client engagement and creating a new revenue stream.

#### **1.5 Change Log**

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-09-29 | 1.0 | Initial PRD draft documenting the existing system and outlining new Epics. | PM (John) |

---
### **Section 2: Requirements (Revised)**

#### **2.1 Functional Requirements (FR)**

**Epic 1: Order Management**
* **FR1**: The user must be able to create and save a new order for a client, specifying articles and quantities.
* **FR2**: The creation of an order must **not** be dependent on or decrement the existing article stock.
* **FR3**: The user must be able to view a list of all locally saved orders.
* **FR4**: The user must be able to modify the articles or quantities of an existing local order.
* **FR5**: The user must be able to delete a locally saved order.
* **FR6 (Revised)**: All **newly created** and **modified** local orders must be queued for synchronization with the server.
* **FR7 (New)**: When an order that was previously synchronized from the server is **deleted locally**, this deletion action must be queued for synchronization. Orders created and deleted entirely offline do not need to be synchronized.

**Epic 2: Tontine Management**
* **FR8**: The user must be able to register a client for a new annual (Jan-Nov) tontine session.
* **FR9**: The user must be able to record a tontine collection (cotisation) for a registered client.
* **FR10**: The collection frequency can be specified as daily, weekly, or monthly.
* **FR11**: After each collection, the application must be able to generate and print a receipt.
* **FR12**: The receipt must clearly state the amount just collected and the **total amount collected to date** for the current session.
* **FR13**: In December, the user must be able to view a client's total tontine savings and select articles for delivery up to that total amount.
* **FR14**: The system must track the delivery status (e.g., "Pending Delivery", "Delivered") for each client at the end of the tontine session.
* **FR15**: All new tontine registrations and collections must be queued for synchronization with the server.
* **FR16**: The user must be able to generate a report detailing their tontine-related activities.

#### **2.2 Non-Functional Requirements (NFR)**

* **NFR1**: The backend services for Order and Tontine management must be developed from scratch, as they do not currently exist.
* **NFR2**: The new backend services must integrate seamlessly with the existing system's authentication, authorization, and data models.
* **NFR3**: All new features on the mobile app must fully support the existing online/offline operational model.
* **NFR4**: The new UI components for these features must adhere to the project's established visual and UX design specifications.
* **NFR5**: The addition of these features must not degrade the performance or stability of the existing application.

#### **2.3 Compatibility Requirements (CR)**

* **CR1**: New backend APIs for Orders and Tontines must be designed to be consistent with the existing API patterns.
* **CR2**: Changes to the local mobile database to support these new features must be implemented via non-destructive schema migrations.
* **CR3**: The synchronization process for Orders and Tontines must integrate into the existing sync mechanism without causing conflicts.

---
### **Section 3: User Interface Enhancement Goals**

#### **3.1 Integration with Existing UI**

All new screens and components for the Order and Tontine features will strictly adhere to the established visual identity and design principles outlined in the existing UI/UX specifications. This includes reusing the defined color palette, typography, spacing, and core components like input fields, buttons, cards, and modals (EC011) to ensure a cohesive user experience.

#### **3.2 Modified/New Screens and Views**

The following new screens will be required to support the new functionalities:

**Order Management:**
* **Order List Screen**: Displays a list of locally saved orders with options to create, edit, or delete.
* **Create/Edit Order Form**: A form for adding or modifying articles and quantities for a client's order.
* **Order Details Screen**: A read-only view summarizing a specific order.

**Tontine Management:**
* **Tontine Dashboard**: Lists all clients participating in the current tontine session, showing their progress.
* **Register for Tontine Form**: A simple form to enroll a client in a new tontine session.
* **Record Collection Form**: A screen for the sales rep to input a tontine payment from a client.
* **Tontine Client History**: Shows a detailed history of a single client's contributions for the year.
* **End-of-Year Delivery Screen**: An interface for selecting articles corresponding to the total amount saved by the client.

#### **3.3 UI Consistency Requirements**

To maintain a consistent and intuitive user experience, all new screens will adopt existing structural patterns. This includes using the same header styles, action button placements, list item layouts, and alert/confirmation dialogs found throughout the rest of the application. The navigation to these new modules will be integrated logically into the existing app structure, likely via the main menu or dashboard.

---
### **Section 4: Technical Constraints and Integration Requirements**

#### **4.1 Existing Technology Stack**

The enhancement will be built upon the existing project's technology. Based on the provided documents and context, the stack is:

* **Languages**: Java (Backend), TypeScript (Frontend)
* **Frameworks**: Spring Boot (Backend), Ionic/Angular (Frontend)
* **Database**: SQL-based (Backend), SQLite (Mobile Local DB)
* **Infrastructure**: Deployed as a service (e.g., "OPTIMIZE-SERVICE")
* **External Dependencies**: OpenAPI for documentation

#### **4.2 Integration Approach**

* **Database Integration Strategy**: The new features will require additions to the backend database schema. The mobile application will update its local SQLite database schema via non-destructive migrations to include new tables for Orders and Tontines.
* **API Integration Strategy**: New RESTful endpoints will be created on the backend for Orders and Tontines. These APIs must follow the existing patterns, including the use of JWT Bearer tokens for authentication and the standard JSON error response format.
* **Frontend Integration Strategy**: The new features will be added as new modules within the existing Ionic/Angular mobile application structure. They will reuse core services for authentication, data storage, and synchronization.
* **Testing Integration Strategy**: New unit and integration tests will be added to the existing test suites for both the backend and frontend to cover the new functionalities.

#### **4.3 Code Organization and Standards**

* **File Structure Approach**: New code will follow the existing project structure (e.g., separating controllers, services, models). On mobile, new feature modules will be created under `src/app/features/`.
* **Naming Conventions**: Existing naming conventions will be maintained for all new files, classes, and variables.
* **Coding Standards**: Development will adhere to standard best practices for Java/Spring Boot and TypeScript/Angular.
* **Documentation Standards**: New API endpoints will be documented using OpenAPI, consistent with the existing backend.

#### **4.4 Deployment and Operations**

* **Build Process Integration**: The new backend modules will be integrated into the existing CI/CD pipeline. The mobile app's build process will be updated to include the new features.
* **Deployment Strategy**: The new backend services will be deployed as part of the main "OPTIMIZE-SERVICE".
* **Monitoring and Logging**: New services must integrate with any existing monitoring and logging solutions.

#### **4.5 Risk Assessment and Mitigation**

* **Technical Risks**: The primary risk is introducing breaking changes to the existing backend or mobile database schema.
* **Integration Risks**: Ensuring the new, from-scratch backend services correctly handle authentication and data consistency with the main application is a key challenge.
* **Deployment Risks**: A failed deployment could impact existing functionalities.
* **Mitigation Strategies**:
    * All database changes will be managed through versioned, non-destructive migration scripts.
    * New APIs will be developed and tested in a separate environment before being integrated.
    * The existing CI/CD pipeline's testing stages will be expanded to cover new features, preventing regressions.

---
### **Section 5: Epic and Story Structure**

#### **5.1 Epic Approach**

The enhancement will be structured into two distinct and independent epics: **Order Management** and **Tontine Management**. This separation is chosen because each feature represents a unique business process with its own data models, backend services, and user workflows. This approach allows for focused development and potentially independent delivery of each major feature.

#### **High-Level Epic Breakdown**

* **Epic 1: Order Management**
    * **Goal**: To enable sales representatives to create, manage, and synchronize client orders directly from the mobile application, independent of existing stock levels. This will serve as a tool for capturing future sales intent.
* **Epic 2: Tontine Management**
    * **Goal**: To introduce and manage a new tontine (savings scheme) product. This includes client registration, contribution collection, end-of-year delivery management, and reporting.

---
### **Section 6: Epic 1: Order Management**

* **Epic Goal**: To enable sales representatives to create, manage, and synchronize client orders directly from the mobile application, independent of existing stock levels. This will serve as a tool for capturing future sales intent.
* **Integration Requirements**: The new Order Management module must integrate with the existing local database (SQLite), reuse existing client and article selection components, and follow the established synchronization patterns for offline data handling. All UI components must adhere to the project's visual design specifications.

---
#### **Story 1.1: Setup Local Database for Orders**
* **As a** developer,
* **I want** to add the necessary tables for "Orders" and "OrderItems" to the local SQLite database,
* **so that** the application can persist order data for offline use.
* **Acceptance Criteria**:
    1.  A new `orders` table is added to the SQLite schema with fields for ID, client ID, date, total amount, and sync status.
    2.  A new `order_items` table is added to the schema with fields for ID, order ID, article ID, quantity, and price.
    3.  TypeScript models (`Order`, `OrderItem`) are created in the application's models directory.
    4.  The core database service is updated with methods to perform Create, Read, Update, and Delete (CRUD) operations for orders and their items.
* **Integration Verification**:
    1.  The application launches without any database migration errors.
    2.  All existing database tables and functionalities (distributions, clients, etc.) remain unaffected.

---
#### **Story 1.2: Implement Order List Screen**
* **As a** sales representative,
* **I want** a screen that lists all my locally saved orders,
* **so that** I can track them and create new ones.
* **Acceptance Criteria**:
    1.  A new "Orders" page is created and made accessible from the main application navigation.
    2.  The page displays a list of all locally saved orders, showing at least the client's name, order date, and total amount.
    3.  A "No orders found" message is shown when the list is empty.
    4.  A floating action button (+) is present, which navigates the user to the "Create Order" form.
* **Integration Verification**:
    1.  The new page integrates correctly into the existing navigation structure (e.g., side menu or tab bar).
    2.  The UI of the list is visually consistent with the existing "Client List" screen, adhering to the project's design system.

---
#### **Story 1.3: Implement Create and Edit Order Form**
* **As a** sales representative,
* **I want** a form to create or edit an order by selecting a client and adding articles with specific quantities,
* **so that** I can accurately capture a client's request offline.
* **Acceptance Criteria**:
    1.  The form allows the user to select an existing client from their local list.
    2.  The user can add multiple articles from the master list, specifying a quantity for each.
    3.  The total amount of the order is automatically calculated and displayed on the form.
    4.  Upon saving, a new order and its associated items are correctly stored in the local SQLite database.
    5.  The form can be opened in "edit mode" for an existing order, pre-filled with its data.
* **Integration Verification**:
    1.  The form reuses the existing client selection and article selection components from the "Distribution" feature to ensure consistency.
    2.  Saving the form correctly utilizes the new database service methods without impacting other services.

---
#### **Story 1.4: Implement Local Order Deletion**
* **As a** sales representative,
* **I want** to delete a locally created order,
* **so that** I can correct mistakes before synchronizing with the server.
* **Acceptance Criteria**:
    1.  An option to delete an order is available from the order list screen (e.g., via a swipe gesture or a menu).
    2.  A confirmation dialog is displayed before the order is permanently deleted.
    3.  Upon confirmation, the selected order and all its associated items are removed from the local database.
* **Integration Verification**:
    1.  The confirmation dialog reuses the standard alert component defined in the UI specifications (EC011).
    2.  Deleting an order does not affect any other data entities like clients, distributions, or collections.

---
#### **Story 1.5: Implement Backend and Sync for Orders**
* **As a** developer,
* **I want** to create the new backend endpoints and the mobile synchronization logic for orders,
* **so that** all order data captured in the field can be saved to the central server.
* **Acceptance Criteria**:
    1.  New backend endpoints are created from scratch to handle CRUD operations for orders (`POST`, `PUT`, `DELETE /api/v1/orders`).
    2.  The mobile application's synchronization service is extended to push new and modified orders to the server.
    3.  The service correctly sends deletion requests for orders that were deleted locally but existed on the server.
    4.  After a successful sync, the local order record is updated with its new server-side ID and its status is marked as synchronized.
* **Integration Verification**:
    1.  The new backend endpoints are secured using the existing authentication and authorization system.
    2.  The new sync logic is integrated into the existing manual and automatic synchronization processes without conflicts.

---
### **Section 7: Epic 2: Tontine Management**

* **Epic Goal**: To introduce and manage a new tontine (savings scheme) product. This includes client registration, contribution collection, end-of-year delivery management, and reporting.
* **Integration Requirements**: The Tontine module requires new local database tables and new backend services to be built from scratch. It must integrate with existing client data and reuse standard UI components for forms and alerts. The new backend services must integrate with the existing authentication and synchronization infrastructure.

---
#### **Story 2.1: Setup Local Database for Tontines**
* **As a** developer,
* **I want** to add tables for `TontineSessions`, `TontineMembers`, and `TontineCollections` to the local SQLite database,
* **so that** the application can manage all tontine-related data offline.
* **Acceptance Criteria**:
    1.  New tables are correctly added to the SQLite database schema via a migration script.
    2.  Corresponding TypeScript models are created for each new table.
    3.  The core database service is extended with methods to handle CRUD operations for tontine data.
* **Integration Verification**:
    1.  The app launches without database errors after the schema update.
    2.  Existing data and features (distributions, orders, etc.) are completely unaffected.

---
#### **Story 2.2: Implement Tontine Dashboard**
* **As a** sales representative,
* **I want** a dashboard screen that lists all clients participating in the current year's tontine,
* **so that** I have a central place to track their progress and manage their accounts.
* **Acceptance Criteria**:
    1.  A new "Tontine" page is created and accessible from the main navigation.
    2.  It displays a list of registered members for the current year's session, showing their name and total amount contributed to date.
    3.  The page includes a clear action button to register a new client for the tontine.
* **Integration Verification**:
    1.  The dashboard UI is visually consistent with the rest of the application's design system.
    2.  The new page is properly integrated into the app's routing and navigation system.

---
#### **Story 2.3: Implement Tontine Client Registration**
* **As a** sales representative,
* **I want** to enroll a client in the current year's tontine session,
* **so that** they can begin making contributions.
* **Acceptance Criteria**:
    1.  The registration process is initiated from the Tontine Dashboard.
    2.  The user can select an existing client from their list.
    3.  A client can only be registered once for the current annual session. The app prevents duplicate registrations.
    4.  Successfully registering a client adds them to the list on the Tontine Dashboard.
* **Integration Verification**:
    1.  The feature reuses the existing, standard client selection component.
    2.  Saving the registration correctly creates a record in the local database using the tontine service.

---
#### **Story 2.4: Implement Contribution Collection and Receipt Printing**
* **As a** sales representative,
* **I want** to record a contribution payment for a tontine member and provide them with a printed receipt,
* **so that** the payment is logged and the client has a physical record.
* **Acceptance Criteria**:
    1.  From the Tontine Dashboard, the user can select a member to open a collection form.
    2.  The user can input a payment amount and save it as a `TontineCollection` record locally.
    3.  After saving, the app prompts the user to print a receipt.
    4.  The printed receipt must contain the client's name, the amount just paid, and the total amount contributed to date for the current session.
* **Integration Verification**:
    1.  The feature successfully reuses the existing Bluetooth printer service.
    2.  A new collection record is correctly associated with the correct tontine member in the local database.

---
#### **Story 2.5: Implement End-of-Year Article Delivery**
* **As a** sales representative,
* **I want** to manage the delivery of articles to tontine members at the end of the year,
* **so that** I can fulfill the company's commitment to the client.
* **Acceptance Criteria**:
    1.  A delivery management interface is available for each member (e.g., from the Tontine Dashboard).
    2.  This interface clearly displays the total amount the client has saved for the year.
    3.  The user can select articles from the master list, ensuring the total value does not exceed the client's savings.
    4.  The user can mark the client's tontine status as "Delivered" in the local database.
* **Integration Verification**:
    1.  The feature reuses the existing, standard article selection component.
    2.  Updating the delivery status does not interfere with other client or distribution data.

---
#### **Story 2.6: Implement Backend and Sync for Tontines**
* **As a** developer,
* **I want** to build the new backend services and mobile synchronization logic for the tontine feature,
* **so that** all field data related to tontines can be securely stored on the central server.
* **Acceptance Criteria**:
    1.  New backend endpoints are created from scratch to handle all CRUD operations for tontine sessions, members, and collections.
    2.  The mobile synchronization service is extended to push all new and updated tontine-related data to these endpoints.
    3.  The synchronization process correctly updates local records with server-side IDs and sync statuses upon completion.
* **Integration Verification**:
    1.  The new backend endpoints are properly secured by the existing authentication system.
    2.  The tontine sync logic is successfully integrated into the application's primary synchronization manager.