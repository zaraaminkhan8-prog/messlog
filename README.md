MessLog
GIKI Mess Meal Logger
The fair way to handle your GIKI mess meals.
https://messlog.lovable.app
1. Overview
MessLog is a web application built for students at Ghulam Ishaq Khan Institute (GIKI) to manage and track their mess meal subscriptions digitally. By replacing the traditional manual sign-in/sign-out process with a smart online system, MessLog prevents unnecessary financial losses for students while simultaneously reducing food waste and protecting the financial health of the mess department.

2. Problem Statement

WHO	GIKI students subscribed to the university mess

PROBLEM	Students frequently forget to log out of the mess, resulting in being charged for meals they did not eat. There is no existing digital mechanism to track individual meal participation, which leads to financial loss for students and inaccurate demand forecasting for the mess.

IMPACT	Wasted money for students, excess food prepared by mess staff, and lost revenue visibility for the institute.

3. Solution
MessLog introduces a digital meal log-in/log-out system that gives students full control over which meals they participate in. The platform tracks meal participation in real time, enabling partial refunds for opted-out meals, demand-based food preparation by mess staff, and transparent meal billing for all parties.

Icon	Feature	Description
🔐	Student Login System	Students register with their GIKI registration number and log in/out per meal session.
💸	40% Refund Policy	Students who log out before a meal receive a 40% refund of that meal's cost — rewarding planning and reducing waste.
🕑	Lunch Cutoff Rule	A new logging day for lunch begins after 2:00 PM, ensuring accurate daily tracking and preventing retroactive log-outs.
👷	Staff Half-Price Meals	Mess staff can claim meals at 50% of the student price, acknowledging their role while keeping the system equitable.
📊	Mess Dashboard	Staff and admins can see real-time meal participation to manage food preparation quantities accurately.

4. Key Design Decisions
4.1 — 40% Refund on Opted-Out Meals
Rather than a binary all-or-nothing billing model, MessLog adopts a partial refund approach. When a student opts out of a meal before the cutoff, 40% of that meal cost is returned to their account balance. This figure was chosen to:
•	Cover the fixed costs already incurred by the mess (ingredient procurement, preparation).
•	Provide meaningful savings to the student as an incentive to log out.
•	Ensure the mess department does not operate at a loss.

4.2 — Digital Meal Log-In / Log-Out System
The core interaction model is a simple toggle: students log in when they intend to eat, and log out when they don't. This replaces ambiguous manual registers and creates a persistent, auditable record per student per meal.
•	Prevents double charging for missed meals.
•	Creates accountability on both sides: student and mess.
•	Enables historical tracking so students can review their meal patterns.

4.3 — Lunch Logging Resets After 2:00 PM
To prevent students from logging out retroactively (after they've already eaten), the system defines a cutoff for lunch at 2:00 PM. After this time, a new logging day begins for the lunch slot. This means:
•	Log-out must happen before 2:00 PM to qualify for a refund.
•	Late log-outs are not penalized but do not earn a refund.
•	The system remains fair without requiring manual enforcement by staff.

4.4 — Staff Half-Price Meal Claims
Mess staff can claim meals at 50% of the standard student price. This design decision serves multiple goals:
•	Staff welfare: ensures affordable meal access for those running the facility.
•	Prevents free-meal abuse while still offering a meaningful discount.
•	Keeps the financial model sustainable; staff meals are still revenue-generating.

5. Value Proposition

Students	Mess Department	Institute
Save money on uneaten meals	Reduce food waste with demand data	Digital record-keeping & transparency
40% refund for logged-out meals	Predictable staffing & prep quantities	Profitable student & staff meal system
Full meal history & dashboard	Staff half-price meal access	Reduced complaints & disputes

6. User Flow
Student
•	Sign up using GIKI registration number
•	View current meal status on dashboard
•	Log out of a meal before the cutoff to earn a 40% refund
•	Check meal history and account balance

Mess Staff
•	Log in via staff account
•	Claim meals at 50% of student price
•	View real-time participation dashboard to plan food quantities

7. Tech Stack
MessLog was built using the Lovable.dev platform (React + Supabase backend), allowing for rapid prototyping of the full-stack application including authentication, database, and UI.
•	Frontend: React (via Lovable)
•	Backend / Database: Supabase
•	Auth: Registration-number-based account creation
•	Hosting: Lovable App Hosting (messlog.lovable.app)

8. Future Improvements
•	Push notifications before meal cutoff times as reminders
•	Weekly and monthly meal cost analytics for students
•	Integration with GIKI student portal for auto-registration
•	Admin panel for adjusting refund percentages and meal pricing
•	QR-code-based physical log-in at mess entrance

MessLog — Built for GIKI Students. Making every meal count.
