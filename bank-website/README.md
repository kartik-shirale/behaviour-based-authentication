# Fraud Detection System

A real-time behavioral analytics platform for banking security using Next.js, Firebase, and advanced behavioral monitoring.

## 🚀 Features

- **User Registration** - Secure user onboarding with personal and banking information
- **Behavioral Profiling** - Advanced analytics for user behavior patterns
- **Real-time Monitoring** - Live session tracking from mobile devices
- **Firebase Integration** - Scalable cloud database with real-time updates
- **Modern UI** - Responsive design with Tailwind CSS and shadcn/ui

## 🏗️ Architecture

### Database Collections
- `users` - User registration data
- `userBehavioralProfiles` - Behavioral analysis profiles
- `behavioralSessions` - Individual session data from mobile devices

### Tech Stack
- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Firebase Firestore
- **State Management**: Zustand
- **Validation**: Zod

## 📱 Key Pages

- `/` - Dashboard with system overview
- `/register` - User registration form
- `/create-profile` - Behavioral profile creation
- `/monitoring` - Real-time user monitoring
- `/sessions` - Behavioral session management

## 🔧 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## 🎯 Behavioral Analytics

The system tracks:
- Touch patterns (taps, swipes, pressure)
- Typing behavior (speed, accuracy)
- Login patterns and authentication
- Location and network data
- Device information and security status

## 🔒 Security Features

- Real-time fraud detection
- Behavioral anomaly detection
- Secure data storage with Firebase
- Mobile device integration ready

---

*Built for advanced banking security and fraud prevention*
