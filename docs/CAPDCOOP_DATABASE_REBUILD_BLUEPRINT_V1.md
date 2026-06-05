Good. The next step is to create the **rebuild documentation branch** and save the blueprint inside the project.

We are not touching the database yet. This step only documents the new foundation plan.

## Step 1: Open Git Bash

Go to your project:

```bash
cd ~/Desktop/capdcoop-platform
```

Check where you are:

```bash
git branch --show-current
git status
```

If you have uncommitted changes, send me the screenshot before continuing.

---

## Step 2: Move to `main` and update it

```bash
git checkout main
git pull origin main
```

---

## Step 3: Create the rebuild branch

```bash
git checkout -b rebuild/foundation-v1
```

If Git says the branch already exists, run:

```bash
git checkout rebuild/foundation-v1
```

Then push the branch:

```bash
git push origin rebuild/foundation-v1
```

---

## Step 4: Create the docs folder and blueprint file

Run:

```bash
mkdir -p docs
touch docs/CAPDCOOP_DATABASE_REBUILD_BLUEPRINT_V1.md
```

Now open the file in VS Code:

```bash
code docs/CAPDCOOP_DATABASE_REBUILD_BLUEPRINT_V1.md
```

If `code` does not work, open VS Code manually and open this file:

```text
capdcoop-platform/docs/CAPDCOOP_DATABASE_REBUILD_BLUEPRINT_V1.md
```

---

## Step 5: Paste this into the file

````md
# CAPDCOOP Database Rebuild Blueprint v1

## 1. Purpose

CAPDCOOP is being rebuilt from a working prototype into a stronger cooperative financial operating system.

The platform must support:

- Member registration and verification
- Financial aid applications
- Aid approval and disbursement
- Aid repayment schedules
- Daily collections
- Savings
- Share purchases
- Agent and team operations
- Cash handovers
- Audit logs
- Member document vault
- Management reporting

The current system works as a prototype, but the database needs clearer separation between expected money, recorded money, approved money, posted financial transactions, and reconciliation.

---

## 2. Naming Standard

CAPDCOOP will use cooperative language.

| Old Term | New Term |
|---|---|
| Loan | Aid |
| Loan Application | Aid Application |
| Loan Amount | Aid Amount |
| Interest Rate | Service Charge Rate |
| Loan Repayment | Aid Repayment |
| Loan Schedule | Aid Repayment Schedule |
| Loan Balance | Outstanding Aid Balance |
| Loan Recovery | Aid Recovery |
| Borrower | Aid Beneficiary / Member |
| Loan Disbursement | Aid Disbursement |

Future database naming should move from:

```text
loans
loan_repayment_schedule
loan_repayments
loan_audit_logs
loan_recovery_notes
````

to:

```text
aid_facilities
aid_repayment_schedule
aid_payments
aid_audit_logs
aid_recovery_notes
```

The live tables should not be renamed immediately. The migration will happen in phases.

---

## 3. Current Table Classification

### Keep and Strengthen

| Table                   | Decision         | Future Role                                   |
| ----------------------- | ---------------- | --------------------------------------------- |
| members                 | Keep             | Official cooperative member registry          |
| agents                  | Keep             | Field agents, BDOs, and collectors            |
| agent_teams             | Keep             | Team structure                                |
| collections             | Keep / Redefine  | Money recorded by agent/admin before approval |
| loans                   | Keep temporarily | Migrate to aid_facilities                     |
| loan_repayment_schedule | Keep temporarily | Migrate to aid_repayment_schedule             |
| loan_audit_logs         | Keep temporarily | Migrate to aid_audit_logs                     |
| savings_accounts        | Keep             | Savings account balance summary               |
| savings_transactions    | Keep             | Approved savings transaction ledger           |
| payments                | Keep / Redefine  | Member-submitted payments                     |
| cash_handovers          | Keep             | Agent-to-office reconciliation                |
| audit_logs              | Keep             | General system audit trail                    |
| payment_method_details  | Keep             | Admin-controlled payment channels             |
| share_certificates      | Keep             | Share certificate records                     |

### Rebuild or Replace

| Current Table         | Decision | Future Replacement                        |
| --------------------- | -------- | ----------------------------------------- |
| business_applications | Rebuild  | aid_applications                          |
| application_documents | Rebuild  | aid_application_documents                 |
| loan_repayments       | Rebuild  | aid_payments                              |
| loan_recovery_notes   | Rebuild  | aid_recovery_notes                        |
| documents             | Rebuild  | member_documents                          |
| savings_withdrawals   | Rebuild  | savings_withdrawal_requests               |
| agent_commissions     | Redefine | Commission ledger after approved activity |

### Retire Later

| Table             | Decision         | Reason                           |
| ----------------- | ---------------- | -------------------------------- |
| daily_collections | Retire / Archive | Empty and duplicates collections |
| notices           | Keep later       | Useful for communications        |

---

## 4. Target Database Modules

### Identity and Roles

```text
profiles
roles
user_roles
```

Roles:

```text
super_admin
admin
finance
risk
agent
member
auditor
```

### Members and Businesses

```text
members
member_businesses
member_status_history
member_documents
```

### Financial Aid

```text
aid_applications
aid_application_documents
aid_facilities
aid_repayment_schedule
aid_payments
aid_audit_logs
aid_recovery_notes
```

### Collections and Reconciliation

```text
collections
collection_allocations
collection_approvals
cash_handovers
daily_reconciliation
```

### Savings

```text
savings_accounts
savings_commitments
savings_transactions
savings_withdrawal_requests
```

### Shares

```text
share_products
share_transactions
member_share_balances
share_certificates
dividend_declarations
dividend_payments
```

### Documents

```text
document_categories
member_documents
document_versions
document_access_logs
```

### Audit and Compliance

```text
audit_logs
financial_event_logs
system_settings
```

---

## 5. Financial Logic Principles

### Collections

A collection means money has been recorded by an agent/admin.

It does not automatically mean:

* aid balance has been updated
* savings balance has been updated
* shares have been credited
* money has been handed over to finance

Collection status flow:

```text
pending → approved → posted
pending → rejected
posted → reversed
```

### Aid Repayment Schedule

The aid repayment schedule is the source of expected aid collections.

It answers:

* who should pay today
* how much is due
* who is overdue
* who has partially paid
* what remains unpaid

### Aid Payments

Aid payments should only be created after finance approves a collection.

### Savings Transactions

Savings transactions should only be created after finance approves a savings collection.

### Share Transactions

Share transactions should only be created after finance approves a share payment or collection.

---

## 6. Recommended Financial Aid Calculation

Current aid calculation rules:

```text
insurance fee = 2.5% of aid amount
registration fee = 5,000 FCFA
service charge = 3% every 30 days
total expected repayment = aid amount + insurance fee + registration fee + service charge
daily repayment = total expected repayment ÷ duration in days
```

The calculation should eventually move out of the React frontend and into a service layer or database function.

---

## 7. Collections Flow

```text
1. Aid repayment schedule shows expected repayment.
2. Agent records collection.
3. Collection status becomes pending.
4. Finance reviews collection.
5. Finance approves or rejects.
6. Approved collection is posted to the correct ledger:
   - aid_payments
   - savings_transactions
   - share_transactions
7. Balances are updated.
8. Audit log is created.
9. Cash handover confirms money reached the office.
```

---

## 8. First Safe Migration Priorities

### Migration 1

Create operational aid views while still reading from current loan tables.

Examples:

```text
v_expected_aid_collections_today
v_overdue_aid_collections
```

### Migration 2

Create new ledger tables:

```text
aid_payments
collection_allocations
financial_event_logs
```

### Migration 3

Create:

```text
member_businesses
```

### Migration 4

Create:

```text
share_transactions
member_share_balances
```

### Migration 5

Create document vault tables:

```text
document_categories
member_documents
document_versions
document_access_logs
```

---

## 9. Code Rebuild Direction

The frontend should not carry all financial logic.

Target structure:

```text
src/types/
  aid.types.ts
  collections.types.ts
  members.types.ts
  savings.types.ts
  shares.types.ts

src/services/
  aid.service.ts
  collections.service.ts
  savings.service.ts
  shares.service.ts
  members.service.ts

src/utils/
  money.ts
  dates.ts
```

Frontend modules should focus on:

* forms
* tables
* buttons
* display

Financial posting should eventually happen through service functions and database RPC functions.

Final target:

```text
approve_collection(collection_id, approved_by)
```

This function should:

* approve the collection
* post aid payment, savings transaction, or share transaction
* update balances
* update schedules
* write audit logs

---

## 10. RLS and Security Rules

Every table must be rebuilt with Supabase RLS in mind.

Basic rules:

```text
Members see only their own records.
Agents see only assigned members and collections.
Finance can approve financial records.
Risk can review aid applications and recovery cases.
Admins can manage operational records.
Super Admin can edit/delete sensitive records with audit logs.
Auditors can view but not modify.
```

No sensitive financial record should be physically deleted. Use soft delete and audit logs.

---

## 11. Implementation Order

```text
1. Keep production frozen.
2. Work on rebuild/foundation-v1 branch.
3. Add this database blueprint.
4. Create operational aid views.
5. Update Collections dashboard to read expected aid collections from views.
6. Create aid_payments and collection_allocations.
7. Move approval logic out of UI.
8. Add member_businesses.
9. Add share ledger.
10. Add document vault tables.
11. Rename UI labels from Loan to Aid.
12. Migrate old loan tables to aid table names only after testing.
```

---

## 12. Rule Going Forward

No database change should be made manually without a migration file.

No new financial feature should be added until its table ownership, approval flow, audit trail, and RLS policy are clear.

````

---

## Step 6: Save, commit, and push

After saving the file:

```bash
git status --short
git add docs/CAPDCOOP_DATABASE_REBUILD_BLUEPRINT_V1.md
git commit -m "docs: add CAPDCOOP database rebuild blueprint"
git push origin rebuild/foundation-v1
````


