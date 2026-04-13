const express = require("express");
const cors    = require("cors");
const path    = require("path");
const mysql   = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

// ── CONEXIÓN A MYSQL (Clever Cloud) ──────────────────────────
const db = mysql.createConnection({
    host:     "b43iu8c49wfqtjtvjerf-mysql.services.clever-cloud.com",
    user:     "ugsjcsvodub0hfcd",
    password: "TiyZWNtK1ZuI4mYq6sGu",
    database: "b43iu8c49wfqtjtvjerf",
    charset:  "utf8mb4"
});

db.connect(err => {
    if (err) {
        console.error("❌ Error conectando a MySQL:", err.message);
    } else {
        console.log("✅ Conectado a MySQL");
        crearTablas();
    }
});

// ── CREAR TABLAS SI NO EXISTEN ───────────────────────────────
function crearTablas() {
    db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            username   VARCHAR(50)  NOT NULL UNIQUE,
            password   VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, err => { if (err) console.error("Error tabla usuarios:", err.message); });

    db.query(`
        CREATE TABLE IF NOT EXISTS mensajes (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            de_usuario   VARCHAR(50) NOT NULL,
            para_usuario VARCHAR(50) DEFAULT NULL,
            mensaje      TEXT        NOT NULL,
            fecha        DATETIME    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, err => { if (err) console.error("Error tabla mensajes:", err.message); });

    // Usuario admin por defecto
    db.query(
        "INSERT IGNORE INTO usuarios (username, password) VALUES (?, ?)",
        ["admin", "admin123"],
        err => { if (!err) console.log("👤 Usuario admin listo → admin / admin123"); }
    );
}

// ── REGISTRO ─────────────────────────────────────────────────
app.post("/registro", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Faltan datos" });

    db.query(
        "INSERT INTO usuarios (username, password) VALUES (?, ?)",
        [username.trim(), password],
        err => {
            if (err) return res.status(400).json({ error: "El usuario ya existe" });
            res.json({ ok: true });
        }
    );
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Faltan datos" });

    // TRIM para evitar espacios accidentales
    db.query(
        "SELECT id, username FROM usuarios WHERE TRIM(username) = ? AND TRIM(password) = ?",
        [username.trim(), password.trim()],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Error en el servidor" });

            if (rows.length === 0)
                return res.status(401).json({ error: "Credenciales incorrectas" });

            res.json({ ok: true, username: rows[0].username });
        }
    );
});

// ── LISTAR USUARIOS ───────────────────────────────────────────
app.get("/usuarios", (req, res) => {
    db.query("SELECT username FROM usuarios ORDER BY username", (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al obtener usuarios" });
        res.json(rows);
    });
});

// ── OBTENER MENSAJES ──────────────────────────────────────────
// ⚠️  Alias: de_usuario → de,  para_usuario → para
// Así app.js puede usar m.de y m.para sin cambios
app.get("/mensajes/:usuario", (req, res) => {
    const usuario = req.params.usuario;

    db.query(`
        SELECT
            de_usuario   AS \`de\`,
            para_usuario AS \`para\`,
            mensaje,
            fecha
        FROM mensajes
        WHERE para_usuario IS NULL
           OR para_usuario = ?
           OR de_usuario   = ?
        ORDER BY fecha ASC
    `, [usuario, usuario], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al obtener mensajes" });
        res.json(rows);
    });
});

// ── ENVIAR MENSAJE ────────────────────────────────────────────
app.post("/mensaje", (req, res) => {
    const { de, para, mensaje } = req.body;

    if (!de || !mensaje)
        return res.status(400).json({ error: "Faltan datos" });

    db.query(
        "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)",
        [de, para || null, mensaje],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Error al guardar mensaje" });
            res.json({ ok: true, id: result.insertId });
        }
    );
});

// ── SERVIDOR ──────────────────────────────────────────────────
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("🚀 Servidor en puerto " + port);
});
