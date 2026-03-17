# Base Web

A modern, minimal, and responsive React + Vite + TypeScript starter project with Google OAuth login, protected API calls, and UI built using shadcn/ui and Tailwind CSS.

## Features

- ⚡️ Vite for fast development and builds
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for utility-first styling
- 🧩 shadcn/ui for beautiful, accessible UI components
- 🔐 Google OAuth login integration
- 🔒 JWT-protected API requests
- 📱 Fully responsive and mobile-friendly
- 🗂️ Clean, scalable file structure

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/base-web.git
cd base-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and edit it:

```env
cp .env.example .env
```

Fill in the required values in .env (VITE_BACKEND_URL and VITE_GOOGLE_CLIENT_ID).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

- Click "Sign in with Google" to log in.
- After login, a JWT is stored and used for authenticated API requests.
- The `/users` endpoint is fetched and displayed in a table if available.
- UI is fully responsive and adapts to light/dark mode.

## Project Structure

```
├── src/
│   ├── components/
│   │   └── ui/         # shadcn/ui components
│   ├── assets/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── .env
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.js
```

## Customization

- Add more shadcn/ui components as needed.
- Update Tailwind config for your brand colors or breakpoints.
- Extend authentication or API logic as your app grows.

## License

MIT
