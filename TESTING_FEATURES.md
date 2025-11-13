# Testing Features and Updates

## Summary of Changes

This document describes the new testing features and improvements made to the Lab Numerator system.

## 1. Test Button for Validation Page

### Location
`/scan` page (Validation page)

### Feature
A "🧪 Test Scan" button has been added to the bottom-right corner of the validation page.

### Functionality
- Generates random patient data for testing purposes
- Always assigns patients to **Sector 151 - SECTOR A**
- Randomizes:
  - Patient names (from a pool of common Spanish names)
  - Document numbers (cédula)
  - Appointment times (horaInicial and horaFinal)
  - Current date for appointments

### Usage
1. Navigate to `/scan`
2. Click the "🧪 Test Scan" button in the bottom-right corner
3. A random patient will be added to the queue automatically
4. The button is disabled while processing to prevent duplicate submissions

### Sample Data Generated
```javascript
{
  code: "TEST{timestamp}",
  name: "{Random First Name} {Random Last Name 1} {Random Last Name 2}",
  cedula: "{7-8 digit random number}",
  digito: "{0-9}",
  sector: 151,
  secDescripcion: "SECTOR A",
  fecha: "{Current date}",
  horaInicial: "{Random time 08:00-12:00}",
  horaFinal: "{Random time 12:00-16:00}"
}
```

## 2. Display Patient Document Instead of Name

### Location
`/display` page (Waiting Room Display)

### Changes
- The waiting list now shows **patient document (CI)** instead of patient name
- Format: `CI: {cedula}`

### Benefits
- Maintains patient privacy in public displays
- Patients can easily identify themselves by their document number

## 3. Station Number (Puesto) Assignment

### Overview
When a nurse calls a patient from the queue, the system now tracks which station (puesto) is calling them.

### Implementation

#### URL Structure
Nurses can access their station panel using:
- `/lab` - Default (Puesto 1)
- `/lab/1` - Puesto 1
- `/lab/2` - Puesto 2
- `/lab/3` - Puesto 3
- etc.

Or using query parameters:
- `/lab?puesto=1`
- `/lab?puesto=2`
- etc.

#### Lab Panel Updates
- Header now shows: "Panel del Laboratorista - Puesto {number}"
- When calling a patient, the notification shows: "Llamando a: {patient name} ({code}) - Puesto {number}"

#### Display Updates
- In the waiting list (`/display`), patients who have been called now show their assigned station
- Displayed as: "**Puesto {number}**" in red/bold under the patient's document

### Data Flow
1. Nurse accesses `/lab/2` (Puesto 2)
2. Nurse clicks "Llamar Siguiente"
3. System assigns patient to Puesto 2
4. Patient record is updated with `puesto: 2`
5. Display screen shows "Puesto 2" for that patient
6. Patient knows to go to station/desk number 2

## 4. Home Page Updates

### Location
`/` (Home page)

### New Section
Added "Acceso Directo por Puesto" section with quick links to:
- Puesto 1
- Puesto 2
- Puesto 3
- Puesto 4
- Puesto 5

### Benefits
- Easy access for nurses to their specific stations
- Testing different scenarios with multiple stations

## Technical Changes

### Modified Files
1. **src/pages/scan.tsx**
   - Added `generateRandomTestData()` function
   - Added `handleTestScan()` function
   - Updated `handleScan()` to accept test data
   - Added test button to UI

2. **src/pages/api/validate.ts**
   - Added support for test mode
   - Accepts `testMode` and `testData` parameters
   - Bypasses SOAP validation when in test mode

3. **src/pages/display.tsx**
   - Changed waiting list to show patient document (CI) instead of name
   - Added display of puesto number when patient is called

4. **src/types/index.ts**
   - Added `puesto?: number` field to Patient interface

5. **src/pages/lab.tsx**
   - Added `useRouter` to extract station number from URL
   - Updated `handleCallNext()` to pass puesto number
   - Updated header to show current puesto number
   - Updated notification to include puesto information

6. **src/lib/queueStore.ts**
   - Updated `callNext()` method to accept and store puesto parameter
   - Patient record is updated with puesto when called

7. **src/pages/api/queue/next.ts**
   - Updated to accept `puesto` parameter
   - Passes puesto to queueStore

8. **src/pages/lab/[id].tsx** (NEW)
   - Dynamic route for accessing specific lab stations
   - Enables URLs like `/lab/1`, `/lab/2`, etc.

9. **src/pages/index.tsx**
   - Added "Acceso Directo por Puesto" section
   - Quick links to stations 1-5

## Testing Scenarios

### Scenario 1: Test Random Patients
1. Go to `/scan`
2. Click "🧪 Test Scan" multiple times to add random patients
3. Go to `/display` to see patients in queue with their CIs
4. Note: All test patients are added to Sector 151 - SECTOR A

### Scenario 2: Multiple Stations
1. Open `/lab/1` in one browser tab (Nurse at Puesto 1)
2. Open `/lab/2` in another tab (Nurse at Puesto 2)
3. Open `/display` in a third tab (Waiting room display)
4. Call patients from each puesto
5. Observe that display shows which puesto called each patient

### Scenario 3: Privacy Check
1. Add patients using test button
2. View `/display` screen
3. Verify that patient names are NOT shown in the waiting list
4. Only patient codes and documents are visible

## API Changes Summary

### POST /api/validate
**New Parameters:**
- `testMode` (boolean): Enable test mode
- `testData` (object): Test patient data

### POST /api/queue/next
**New Parameters:**
- `puesto` (number): Station number calling the patient

## Database Schema Changes

### Patient Object
```typescript
interface Patient {
  // ... existing fields
  puesto?: number; // NEW: Station number that called the patient
}
```

## Notes

- Test button is always visible (not just in development) for easy testing in any environment
- Test codes are prefixed with "TEST" followed by timestamp to ensure uniqueness
- Default puesto is 1 if no URL parameter is provided
- The puesto number is only assigned when a patient is called, not when they first scan

