const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Base de données SQLite ---
const db = createClient({
  url: 'file:./users.db'
});

// Initialiser la table users au démarrage
async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT    NOT NULL UNIQUE,
      password  TEXT    NOT NULL,
      createdAt TEXT    NOT NULL
    )
  `);
  console.log('✅ Base de données prête (users.db)');
}

// --- Middlewares ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- Routes ---

// POST /api/register — Créer un compte
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  // Validations
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min.).' });
  }

  try {
    // Hasher le mot de passe avec bcrypt (10 rounds = bon équilibre sécurité/vitesse)
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute({
      sql: 'INSERT INTO users (email, password, createdAt) VALUES (?, ?, ?)',
      args: [email, hashedPassword, new Date().toISOString()]
    });

    return res.status(201).json({ message: 'Compte créé avec succès !' });

  } catch (err) {
    // Code d'erreur SQLite pour UNIQUE constraint (email déjà pris)
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    console.error('Erreur inscription:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/login — Se connecter
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  try {
    // Chercher l'utilisateur par email
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      // On renvoie le même message que si le mot de passe est faux
      // (sécurité : ne pas révéler si l'email existe)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Comparer le mot de passe avec le hash stocké
    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Ne jamais renvoyer le mot de passe au client !
    return res.json({
      message: 'Connexion réussie !',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Erreur connexion:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/users/count — Nombre d'utilisateurs (pour l'affichage)
app.get('/api/users/count', async (req, res) => {
  try {
    const result = await db.execute('SELECT COUNT(*) as total FROM users');
    res.json({ total: result.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.use(express.static(path.join(__dirname, '../dist')));

app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// --- Démarrage ---
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
});
