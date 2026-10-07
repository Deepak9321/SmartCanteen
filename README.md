# Smart Canteen - Node.js + Express + MongoDB

## Authentication flow

- Student: `/register` -> create account -> `/login` -> Student portal.
- Manager: `/manager/login` -> manager login only.
- Managers cannot self-register from the student registration page.

## Setup

1. Copy `.env.example` to `.env`.
2. Put your working MongoDB Atlas connection string in `.env`.
3. Install packages:

```bash
npm install
```

4. Seed demo data if required:

```bash
npm run seed
```

5. Start the application:

```bash
npm run dev
```

Open `http://localhost:5000`.

## Demo accounts

Student:
- Email: `student@smartcanteen.com`
- Password: `Student@123`

Manager:
- Email: `manager@smartcanteen.com`
- Password: `Manager@123`

## Security

Never commit `.env` or expose your MongoDB password in screenshots or source code.
