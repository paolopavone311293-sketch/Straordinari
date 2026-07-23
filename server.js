import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// In produzione (Render) la chiave arriva dalla variabile d'ambiente FIREBASE_KEY
// (contenuto JSON del service account). In locale, fallback al file firebase-key.json.
let serviceAccount;
if (process.env.FIREBASE_KEY) {
  console.log('Loading Firebase key from env var FIREBASE_KEY');
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} else {
  const keyPath = `${__dirname}/firebase-key.json`;
  console.log('Loading Firebase key from file:', keyPath);
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}
console.log('Firebase key loaded successfully');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'straordinari-d4767'
});

const db = admin.firestore();

// API: Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Register request:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Compila tutti i campi' });
    }

    const userRef = db.collection('users').doc(username);
    console.log('Checking if user exists...');
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(400).json({ error: 'Nome utente già esistente' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Creating user document...');

    await userRef.set({
      username,
      password: hashedPassword,
      createdAt: new Date(),
      entries: [],
      entryTime: '07:45',
      workHours: 0,
      limit: 25,
      name: ''
    });

    console.log('User registered successfully');
    res.json({ success: true, username });
  } catch (error) {
    console.error('Register error:', error.code, error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Compila tutti i campi' });
    }

    const userRef = db.collection('users').doc(username);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(400).json({ error: 'Nome utente o password non validi' });
    }

    const userData = userDoc.data();
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Nome utente o password non validi' });
    }

    res.json({
      success: true,
      username,
      data: {
        entries: userData.entries || [],
        entryTime: userData.entryTime || '07:45',
        workHours: userData.workHours || 0,
        limit: userData.limit || 25,
        name: userData.name || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Save user data
app.post('/api/users/:username/save', async (req, res) => {
  try {
    const { username } = req.params;
    const { entries, entryTime, workHours, limit, name } = req.body;

    await db.collection('users').doc(username).update({
      entries,
      entryTime,
      workHours,
      limit,
      name,
      updatedAt: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
