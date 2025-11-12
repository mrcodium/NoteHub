# NoteHub 📝✨

![NoteHub Banner](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776796/Screenshot_2025-07-17_232545_f0ucxh.png)

A modern note-taking app with rich editing, collaboration, and cloud sync.

## Live Demo

🌐 [https://notehub-38kp.onrender.com](https://notehub-38kp.onrender.com)

## ✨ Editor Features

| Feature | Visual | Description |
|---------|--------|-------------|
| **Rich Text Formatting** | ![Rich Text](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752777133/Screenshot_2025-07-18_000149_yvaarv.png) | Bold, italic, headings, lists, blockquotes, and more |
| **Code Blocks** | ![Code](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776757/Screenshot_2025-07-17_233033_nbxykt.png) | Syntax highlighting for 100+ programming languages |
| **LaTeX Math** | ![Math](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776746/Screenshot_2025-07-17_233300_wrm65f.png) | Beautiful mathematical equations with KaTeX rendering |
| **Todo Lists** | ![Todo](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776723/Screenshot_2025-07-17_233856_ze2irj.png) | Interactive checklists with progress tracking |
| **Real-time Collaboration** | ![Collab](https://res.cloudinary.com/dhtxrpqna/image/upload/v1752778393/Screenshot_2025-07-18_002236_xqme0u.png) | Co-edit documents with live presence indicators |
| **Version History** | ![History](https://img.icons8.com/ios/50/000000/time-machine.png) | View and restore previous versions of your notes |
| **Dark/Light Mode** | ![Theme](https://img.icons8.com/ios/50/000000/contrast.png) | Full theme customization with system preference detection |

## 🖼️ App Screenshots

<div align="center">
  <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776833/Screenshot_2025-07-17_232528_sazanl.png" width="45%" alt="Profile Page">
  <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1752776798/Screenshot_2025-07-17_232655_tzgfti.png" width="45%" alt="Settings Page">  
  <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1752777921/profile-mobile-view_xbncnn.jpg" width="30%" alt="Mobile Profile">
  <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1752777931/collection-dashboard_l7uf1y.jpg" width="30%" alt="Mobile Dashboard">
</div>

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + ShadCN UI
- Tiptap Editor (ProseMirror-based)
- Vite + SWC (Ultra-fast builds)
- React Query (Data fetching)
- Zustand (State management)

**Backend:**
- Node.js + Express
- MongoDB Atlas (Database)
- JWT Authentication
- Socket.IO (Real-time updates)
- Cloudinary (Media storage)
- Mongoose (ODM)

**DevOps:**
- Render (Hosting)
- GitHub Actions (CI/CD)
- ESLint + Prettier (Code quality)

## ⚙️ Setup Guide

### Backend Configuration

Create `.env` in `/backend`:

```env
PORT=5000
JWT_SECRET=your_64char_secret_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=your_secret_key

# OAuth
GOOGLE_CLIENT_ID=123-abcd.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

NODE_ENV=development
```

### 🛠️ Frontend Configuration

Create a `.env`  the `/frontend` 

```env
VITE_API_BASE=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=123-abcd.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000
```


