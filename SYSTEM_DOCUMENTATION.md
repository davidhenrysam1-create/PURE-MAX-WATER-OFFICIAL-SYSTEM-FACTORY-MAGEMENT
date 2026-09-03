# Pure Max Factory Management System - Full Documentation

## 1. System Overview
The **Pure Max Factory Management System** is a localized, offline-first, full-stack operational software designed specifically for a mineral water production factory located in Sierra Leone (Makeni). It replaces paper-based ledgers by offering a comprehensive digital suite to track sales, production batches, raw material inventory, staff attendance, expenses, machine repairs, and live delivery fleet tracking.

### 1.1 Problems This System Solves
*   **Paper Dependency & Data Loss**: Eliminates physical ledgers that are easily lost, damaged, or manipulated.
*   **Offline Connectivity Constraints**: Solves the issue of spotty internet in Makeni by caching data locally (IndexedDB) and seamlessly syncing when a connection is restored.
*   **Lack of Real-Time Fleet Accountability**: Delivery staff (tricycles/vans) often lacked oversight. The system introduces live GPS mapping to track delivery assets.
*   **Fragmented Communication**: Replaces fragmented WhatsApp groups with an internal, secure WebRTC voice/video and chat broadcasting system.
*   **Financial Leakage**: Imposes strict role-based constraints so sales, expenses, and production records cannot be altered maliciously without audit logs.

---

## 2. Features

### 2.1 Functional Features
*   **Offline-First Data Syncing**: Staff can log data without internet. The system queues transactions and pushes them to the Cloud PostgreSQL database once online.
*   **Sales & Revenue Tracking**: Tracks factory direct sales, van sales, and tricycle sales, computing daily net totals in Sierra Leone Leones (SL Le).
*   **Production & Inventory Management**: Logs daily water sachet output, tracks raw packaging roll usage (start/end weight), and monitors outer bag inventory.
*   **Live GPS Fleet Tracking**: Captures live geolocation coordinates of logged-in delivery staff and displays them on an interactive Leaflet map.
*   **Internal Real-Time Chat & Calls**: Built-in messaging, voice notes, and WebRTC peer-to-peer audio/video calls.
*   **Attendance & Payroll**: Tracks staff clock-in/out times, automates daily/monthly wage calculation, and prevents unverified clock-ins.
*   **Expenses & Repairs Management**: Dedicated modules to track generator fuel (diesel), machine maintenance, and operational purchases.
*   **Granular User Management**: Admins can suspend, activate, reset passwords, and assign specific operational roles to staff.

### 2.2 Non-Functional Features
*   **Progressive Web App (PWA)**: Installable directly to mobile home screens for native-like performance.
*   **Security & Audit Logging**: Records timestamps and operator names for critical deletions, edits, and login attempts.
*   **Responsive UI/UX**: Designed flawlessly for both wide desktop monitors (factory office) and small mobile devices (field delivery staff).
*   **Optimized Media Storage**: Profile avatars and images are compressed strictly to WebP format to save bandwidth and reduce database load.

---

## 3. Actor Relationships & Role-Based Access

The system enforces strict role-based access control (RBAC). Here is how different actors interact:

*   **Developer (`developer`) & CEO (`ceo`)**: 
    *   *Access*: Absolute. Can view all dashboards, reset system-wide factory data, create/delete accounts, view financial margins, and override any restriction.
*   **Factory Manager (`manager`) & Second Manager (`second_manager`)**:
    *   *Access*: High. Can oversee daily operations, approve expenses, log production, track fleet locations, and manage general staff accounts. Cannot reset the entire database.
*   **Accountant (`accountant`)**:
    *   *Access*: Financial. Focuses on the Sales, Expenses, and Payroll (Attendance) modules. Monitors profit/loss margins.
*   **Supervisor (`supervisor`)**:
    *   *Access*: Floor operations. Can log production batches, track machine repairs, and manage factory worker attendance.
*   **Delivery Staff (`van_staff`, `tricycle_staff`)**:
    *   *Access*: Field operations. Can log their own daily sales, chat with the factory, and broadcast their GPS location. Cannot see overall factory profit margins.
*   **Factory Worker (`factory_worker`) & Security (`security`)**:
    *   *Access*: Minimal. Primarily uses the system for attendance (clocking in), reading announcements, and accessing internal chat.

---

## 4. Core Modules Explained

### 4.1 Sales Module
*   **How it works**: Staff log individual sales records indicating quantity sold, rate per bag, and total amount (SL Le). The system automatically attributes the sale to the logged-in user.
*   **Actor**: Delivery Staff log field sales; Managers log factory-direct wholesale purchases.

### 4.2 Production Module
*   **How it works**: Tracks the core manufacturing pipeline. Supervisors log the serial code of plastic film rolls, their starting weight, ending weight, and the number of water bags produced from that specific roll. It calculates "waste" or missing yields automatically.
*   **Actor**: Factory Supervisors and Managers.

### 4.3 GPS Fleet Tracking (Map Module)
*   **How it works**: When a `van_staff` or `tricycle_staff` logs in and grants location permissions, their device periodically emits coordinates via WebSockets. The Manager's dashboard plots these on an interactive map, calculating speed and exact delivery routes.
*   **Actor**: Delivery Staff (Emitting) -> Managers/CEO (Monitoring).

### 4.4 Attendance Module
*   **How it works**: A digital punch-clock. Records time-in and time-out. The system applies the user's `dailySalaryLe` to calculate total accrued wages.
*   **Actor**: All Staff (Clocking in) -> Accountant/Manager (Reviewing payroll).

### 4.5 Expenses, Repairs & Fuel Modules
*   **How it works**: Prevents unaccounted petty cash loss. Every liter of diesel bought for the generator, every spare part for the sealing machines, and every roll of outer bags is logged with a vendor name, amount, and category.
*   **Actor**: Managers and Accountants.

---

## 5. System Use Cases

1.  **Use Case 1: Start of Day Operations**
    *   *Action*: The Manager opens the app, reviews the dashboard.
    *   *Action*: Factory workers arrive, log into their accounts on a shared tablet, and click "Clock In" on the Attendance module.
2.  **Use Case 2: Field Delivery (Offline)**
    *   *Action*: A tricycle driver is deep in a Makeni neighborhood with no 3G network.
    *   *Action*: They sell 50 bags of water. They open the app and log the sale.
    *   *Result*: The app saves the sale to local storage (IndexedDB). Once the driver returns to the factory (where Wi-Fi is available), the app automatically pushes the queued sale to the central database.
3.  **Use Case 3: Emergency Breakdown**
    *   *Action*: The sachet machine breaks down.
    *   *Action*: The Supervisor logs an "Equipment Repair" entry detailing the broken heating element.
    *   *Action*: The Manager receives a notification, approves petty cash, and logs it in the "Expenses" module under Maintenance.

---

## 6. Upcoming Features (Future Roadmap)

While the current architecture is robust, future versions of the Pure Max OS are planned to include:

1.  **Predictive AI Inventory Analytics**: Utilizing machine learning to predict when diesel fuel or packaging rolls will run out based on historical usage rates.
2.  **SMS Gateway Integration**: Automatically sending an SMS receipt to wholesale customers when they purchase large quantities of water.
3.  **Customer Database (CRM)**: Storing a directory of regular shops and buyers to track customer debt/credit lines.
4.  **Automated Daily Email Reports**: Compiling all sales, production, and expenses into a PDF and emailing it to the CEO at midnight every day.
5.  **Multi-Factory Scaling**: Expanding the database architecture to support `Factory 1 (Makeni)` and `Factory 2 (Freetown)` with isolated and combined analytics.
