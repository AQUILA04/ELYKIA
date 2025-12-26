# Credit Merge Functionality Documentation

## Overview
This module provides a complete credit merge functionality that allows users to merge multiple credits for a specific commercial into a single credit.

## Components

### CreditMergeModalComponent
- **Purpose**: Modal dialog for selecting and merging credits
- **Location**: `src/app/credit/credit-merge-modal/`
- **Key Features**:
  - Commercial selection with validation
  - Credit selection with multi-select capability
  - Form validation with user-friendly error messages
  - Loading states and progress indicators
  - Input sanitization and security measures

### CreditListComponent
- **Purpose**: Main credit list with merge functionality integration
- **Location**: `src/app/credit/credit-list/`
- **Key Features**:
  - Merge button to open modal
  - Automatic list refresh after successful merge
  - Collector loading and management

## Services

### CreditService
- **Methods**:
  - `getMergeableCredits(commercialUsername: string)`: Get credits that can be merged
  - `mergeCredits(mergeData: MergeCreditDto)`: Execute the merge operation

## Types and Interfaces
- **Location**: `src/app/credit/types/credit-merge.types.ts`
- **Key Types**: Collector, ValidationErrors, CreditMergeState
- **Type Guards**: Runtime validation functions
- **Constants**: Validation limits and messages

## Usage
1. Click "Fusion" button in credit list
2. Select a commercial from dropdown
3. Select 2-10 credits to merge
4. Click "Fusionner" to execute merge
5. View success message with new credit reference

## Security Features
- Input sanitization for all user inputs
- Type validation with TypeScript
- XSS prevention measures
- Proper error handling and user feedback

## Testing
- Integration tests available in `credit-merge-integration.spec.ts`
- Tests cover complete workflow, error scenarios, and validation