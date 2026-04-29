const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Connexion à la base de données PostgreSQL
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Création de la table users si elle n'existe pas encore
async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      email     TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
  console.log('✅ Base de données PostgreSQL prête');
}

// Autoriser les requêtes depuis n'importe quel site
app.use(cors({ origin: '*' }));
// Permettre de lire le JSON envoyé par le front-end
app.use(express.json());
// Servir les fichiers du front-end React compilé
app.use(express.static(path.join(__dirname, '../dist')));

// Route inscription
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  // Vérifications de base
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min.).' });
  try {
    // Hasher le mot de passe avec bcrypt avant de le stocker
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insérer le nouvel utilisateur dans la base de données
    await db.query(
      'INSERT INTO users (email, password, createdAt) VALUES ($1, $2, $3)',
      [email, hashedPassword, new Date().toISOString()]
    );
    return res.status(201).json({ message: 'Compte créé avec succès !' });
  } catch (err) {
    // Code 23505 = email déjà utilisé (contrainte UNIQUE PostgreSQL)
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Route connexion
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  try {
    // Chercher l'utilisateur par son email dans la base
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    // Si aucun utilisateur trouvé, refuser la connexion
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    // Comparer le mot de passe entré avec le hash stocké
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    // Renvoyer les infos de l'utilisateur sans le mot de passe
    return res.json({
      message: 'Connexion réussie !',
      user: { id: user.id, email: user.email, createdAt: user.createdat }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Route pour compter les utilisateurs inscrits
app.get('/api/users/count', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as total FROM users');
    res.json({ total: result.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Rediriger toutes les autres URLs vers le front-end React
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Démarrer le serveur
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
});
