# InterProject - Railway Management Web App

InterProject is a responsive, frontend-first Railway Management System built using pure HTML, CSS, and Vanilla JavaScript.
It includes a landing experience, authentication flow, analytics dashboard, settings management, support pages, and legal pages.

## Project Description

This project demonstrates a production-style frontend architecture without framework dependency.
The codebase is organized section-wise and flow-wise for readability, maintainability, and interview-level review.

Key focus areas:
- UI-first structure and clean component flow
- Role-based dashboard behavior (viewer/admin)
- Transaction CRUD, filtering, sorting, and CSV export
- Charts and insights rendering using Canvas API
- Security-conscious frontend handling (safer DOM rendering, reduced inline handlers)

## Demo Login

Demo login: use any Gmail and any password to login.

## Features

- Landing page with animated hero, navigation, and chatbot widget
- Login/Register UI with validation and password strength hints
- Railway dashboard with:
   - Total Balance, Income, Expense cards
   - Best month and top category insights
   - Monthly trend and category charts
   - Transaction add/edit/delete/search/filter/sort
   - CSV export and save state
- Profile overview and profile image support
- Settings page for role switch, profile update, export/reset actions
- Support pages: Help Center, Contact Us, Community, Status
- Legal pages: Privacy Policy, Terms, Cookie Policy

## Project Structure

```text
interproject/
├── index.html
├── admin.css
├── Admin.js
├── signup/
│   ├── signup.html
│   ├── signup.css
│   ├── signup.js
│   └── forgot-password.html
├── dashboard/
│   ├── common.css
│   ├── common.js
│   ├── dash.html
│   ├── dash.css
│   ├── dash.js
│   └── setting/
│       ├── setting.html
│       ├── setting.css
│       └── setting.js
├── support/
│   ├── help-center.html
│   ├── contact-us.html
│   ├── community.html
│   └── status-page.html
├── legal/
│   ├── privacy.html
│   ├── terms.html
│   └── cookies.html
├── video/
├── LICENSE
└── README.md
```

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Font Awesome / Ionicons via CDN

## Run Locally

1. Clone repository:

```bash
git clone https://github.com/siddharthagupta3/project-.git
cd interproject
```

2. Open `index.html` in your browser.

No build step or package installation is required.

## Interview Readiness (Current)

- Frontend interview readiness: 90%+
- Strengths:
   - Modular, sectioned JavaScript structure
   - Clear UI flow and code readability
   - Functional feature coverage across modules
- Remaining optional upgrades:
   - Add test cases and CI pipeline
   - Convert repeated support-page logic into shared modules

## Author

Siddhartha Gupta

## License

MIT License. See LICENSE.

---

Last Updated: April 5, 2026

MONGODB_URI = mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/interproject?retryWrites=true&w=majority
JWT_SECRET = your_long_random_secret_1
JWT_REFRESH_SECRET = your_long_random_secret_2
ALLOWED_ORIGINS = https://your-project.vercel.app,https://your-project-git-main-yourname.vercel.app
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = yourgmail@gmail.com
SMTP_PASS = your_app_password
FROM_EMAIL = yourgmail@gmail.com
NODE_ENV = production
