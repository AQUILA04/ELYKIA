# Implementation Plan

- [x] 1. Extend Credit Service with merge functionality





  - Add new interfaces for credit merge operations (CreditSummaryDto, MergeCreditDto, ApiResponse)
  - Implement getMergeableCredits() method to call GET /api/v1/credits/mergeable/{commercialUsername}
  - Implement mergeCredits() method to call POST /api/v1/credits/merge
  - Add proper error handling following existing service patterns
  - _Requirements: 2.2, 4.1, 4.2, 6.2, 6.3_

- [x] 2. Create Credit Merge Modal Component





- [x] 2.1 Generate component structure and basic setup


  - Create credit-merge-modal.component.ts with component class and basic properties
  - Create credit-merge-modal.component.html with modal structure
  - Create credit-merge-modal.component.scss with component-specific styles
  - Set up component inputs/outputs for communication with parent component
  - _Requirements: 2.1, 5.1, 5.2_

- [x] 2.2 Implement commercial selection functionality


  - Add dropdown for commercial selection using collectors input
  - Implement onCommercialChange() method to trigger credit loading
  - Add loading state management for credit fetching
  - Handle empty commercial selection state
  - _Requirements: 2.1, 2.2, 7.1_

- [x] 2.3 Implement credit selection and display


  - Create credit list display with checkboxes for multiple selection
  - Implement onCreditSelection() method to manage selected credit IDs
  - Add credit information display (reference, date, amount) with proper formatting
  - Handle empty credits list with informative message
  - _Requirements: 2.3, 3.1, 3.2, 5.3, 5.4_

- [x] 2.4 Implement merge functionality and validation


  - Add merge button with proper validation (minimum 2 credits selected)
  - Implement mergeCreditsList() method to call credit service
  - Add merge loading state and button state management
  - Implement success/error handling with appropriate user feedback
  - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.3_

- [ ]* 2.5 Write unit tests for Credit Merge Modal Component
  - Test component initialization and property binding
  - Test commercial selection and credit loading
  - Test credit selection/deselection logic
  - Test merge validation and execution
  - Test error handling scenarios
  - _Requirements: All modal-related requirements_

- [x] 3. Modify Credit List Component for merge integration





- [x] 3.1 Add merge button to credit list interface


  - Add "Fusion" button next to existing "Ajouter" button with consistent styling
  - Implement openMergeModal() method to show merge modal
  - Add showMergeModal boolean property for modal visibility control
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 3.2 Implement modal integration and data flow


  - Add collectors property and loadCollectors() method
  - Implement closeMergeModal() method for modal dismissal
  - Implement onMergeSuccess() method to handle successful merge and refresh credit list
  - Add modal component to template with proper event binding
  - _Requirements: 1.2, 4.4, 4.5_

- [ ]* 3.3 Write unit tests for Credit List Component modifications
  - Test merge button display and click handling
  - Test modal opening and closing functionality
  - Test collectors loading
  - Test credit list refresh after successful merge
  - _Requirements: 1.1, 1.2, 4.4_

- [x] 4. Implement error handling and user feedback





- [x] 4.1 Add comprehensive error handling in service methods


  - Implement handleApiError() method for consistent error message formatting
  - Add specific error handling for different HTTP status codes
  - Handle network errors and timeouts appropriately
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 Implement user feedback and notification system


  - Add success notifications for successful merge operations
  - Add error notifications with clear, actionable messages
  - Implement loading states with appropriate visual indicators
  - Add form validation messages for required fields
  - _Requirements: 4.3, 4.4, 4.5, 6.1, 6.2, 7.3, 7.4_

- [ ]* 4.3 Write integration tests for error handling
  - Test API error scenarios and user feedback
  - Test network error handling
  - Test validation error display
  - Test loading state management
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Style and UI consistency implementation





- [x] 5.1 Implement responsive modal design


  - Add responsive CSS for modal layout on different screen sizes
  - Ensure proper mobile/tablet compatibility
  - Implement scrollable credit list for long lists
  - Add proper spacing and alignment following existing design patterns
  - _Requirements: 5.1, 5.2_

- [x] 5.2 Implement consistent styling and formatting


  - Apply consistent button styling matching existing "Ajouter" button
  - Implement proper currency formatting for amounts using XOF pipe
  - Implement proper date formatting (DD/MM/YYYY) for display
  - Add consistent loading spinners and visual feedback
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 5.3 Write UI/UX tests
  - Test responsive behavior on different screen sizes
  - Test accessibility features (keyboard navigation, screen readers)
  - Test visual consistency with existing components
  - Test loading states and user feedback
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Final integration and validation







- [x] 6.1 Integrate all components and test complete workflow




  - Test complete user flow from credit list to successful merge
  - Verify proper data flow between components and services
  - Test modal opening, selection, merge, and list refresh cycle
  - Validate all error scenarios work end-to-end
  - _Requirements: All requirements_

- [x] 6.2 Implement final validation and cleanup




  - Add final form validation and user input sanitization
  - Implement proper component cleanup (unsubscribe from observables)
  - Add proper TypeScript typing for all data structures
  - Verify all requirements are met and functioning correctly
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 6.3 Write end-to-end tests
  - Test complete merge workflow with real API calls
  - Test error scenarios with backend integration
  - Test performance with large datasets
  - Test concurrent user scenarios
  - _Requirements: All requirements_