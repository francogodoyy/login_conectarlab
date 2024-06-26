// Importación de módulos necesarios
var express = require('express');  // Framework para aplicaciones web de Node.js
var users = express.Router();      // Router de Express para definir rutas
var database = require('../Database/database');  // Módulo para la conexión y consultas a la base de datos
var cors = require('cors');        // Middleware para manejar Cross-Origin Resource Sharing (CORS)
var jwt = require('jsonwebtoken'); // Librería para generar y verificar tokens JWT
var bcrypt = require('bcrypt');    // Librería para encriptar contraseñas
var nodemailer = require('nodemailer'); // Librería para enviar correos electrónicos

// Middleware para habilitar CORS en todas las rutas de 'users'
users.use(cors());

// Configuración de la clave secreta para firmar y verificar tokens JWT
process.env.SECRET_KEY = "conectarlab_login";

// Configuración de nodemailer para el envío de correos electrónicos
var transporter = nodemailer.createTransport({ 
    service: 'gmail',
    auth: {
        user: 'alanfrancogodoy@gmail.com',
        pass: 'qrzd kzzf frag ivtz' // Asegúrate de no exponer contraseñas en el código fuente en producción
    }
});

// Endpoint POST '/register': Maneja el registro de nuevos usuarios
users.post('/register', function(req, res) {
    var today = new Date();
    var appData = {
        "error": 1,
        "data": ""
    };

    var userData = {
        "email": req.body.email,
        "password": bcrypt.hashSync(req.body.password, 10), // Encripta la contraseña antes de guardarla
        "created": today
    };

    database.connection.getConnection(function(err, connection) {
        if (err) {
            console.error("Error en la conexión a la base de datos:", err);
            appData["error"] = 1;
            appData["data"] = "Error en el servidor interno";
            res.status(500).json(appData);
        } else {
            connection.query('INSERT INTO users SET ?', userData, function(err, rows, fields) {
                if (!err) {
                    appData.error = 0;
                    appData["data"] = "Usuario registrado correctamente!";
                    res.status(201).json(appData);
                } else {
                    console.error("Error al ejecutar la consulta SQL:", err);
                    appData["data"] = "Ocurrió un error!";
                    res.status(400).json(appData);
                }
            });
            connection.release();
        }
    });
});

// Endpoint POST '/login': Maneja la autenticación de usuarios
users.post('/login', function(req, res) {
    var appData = {};
    var email = req.body.email;
    var password = req.body.password;

    database.connection.getConnection(function(err, connection) {
        if (err) {
            console.error("Error en la conexión a la base de datos:", err);
            appData["error"] = 1;
            appData["data"] = "Error en el servidor interno";
            res.status(500).json(appData);
        } else {
            connection.query('SELECT * FROM users WHERE email = ?', [email], function(err, rows, fields) {
                if (err) {
                    console.error("Error al ejecutar la consulta SQL:", err);
                    appData.error = 1;
                    appData["data"] = "Ocurrió un error!";
                    res.status(400).json(appData);
                } else {
                    if (rows.length > 0) {
                        bcrypt.compare(password, rows[0].password, function(err, result) {
                            if (result) {
                                let payload = {
                                    id: rows[0].id,
                                    email: rows[0].email
                                };
                                let token = jwt.sign(payload, process.env.SECRET_KEY, {
                                    expiresIn: 1440 // Token expira en 24 horas
                                });
                                appData.error = 0;
                                appData["token"] = token;
                                res.status(200).json(appData);
                            } else {
                                appData.error = 1;
                                appData["data"] = "El Email o la Contraseña no coinciden";
                                res.status(204).json(appData);
                            }
                        });
                    } else {
                        appData.error = 1;
                        appData["data"] = "El email no existe!";
                        res.status(204).json(appData);
                    }
                }
            });
            connection.release();
        }
    });
});

// Middleware para verificar la validez del token JWT en las solicitudes entrantes
function verifyToken(req, res, next) {
    var token = req.body.token || req.headers['token']; // Obtiene el token JWT de la solicitud
    var appData = {}; // Objeto para almacenar la respuesta de la API
    if (token) {
        // Verifica la validez del token JWT
        jwt.verify(token, process.env.SECRET_KEY, function(err) {
            if (err) {
                // Si el token no es válido
                appData["error"] = 1;
                appData["data"] = "Token inválido";
                res.status(500).json(appData);
            } else {
                // Si el token es válido, continúa con la siguiente función middleware
                next();
            }
        });
    } else {
        // Si no se proporciona un token en la solicitud
        appData["error"] = 1;
        appData["data"] = "Por favor, envía un token";
        res.status(403).json(appData); // Respuesta con código HTTP 403 (Forbidden)
    }
}

// Endpoint GET '/getUsers': Obtiene todos los usuarios de la base de datos (requiere verificación de token)
users.get('/getUsers', verifyToken, function(req, res) {
    var appData = {}; // Objeto para almacenar la respuesta de la API

    // Conexión a la base de datos
    database.connection.getConnection(function(err, connection) {
        if (err) {
            // Manejo de errores de conexión
            appData["error"] = 1;
            appData["data"] = "Error en el servidor interno";
            res.status(500).json(appData);
        } else {
            // Ejecución de la consulta SQL para obtener todos los usuarios de la tabla 'users'
            connection.query('SELECT * FROM users', function(err, rows, fields) {
                if (!err) {
                    // Si la consulta se realiza con éxito
                    appData["error"] = 0;
                    appData["data"] = rows;
                    res.status(200).json(appData); // Respuesta con código HTTP 200 (OK)
                } else {
                    // Si no se encontraron datos
                    appData["data"] = "No se encontraron datos";
                    res.status(204).json(appData); // Respuesta con código HTTP 204 (No Content)
                }
            });
            // Liberación de la conexión a la base de datos
            connection.release();
        }
    });
});

// Endpoint POST '/requestPasswordReset': Maneja la solicitud de restablecimiento de contraseña
users.post('/requestPasswordReset', function(req, res) {
    var email = req.body.email; // Email del usuario que solicita el restablecimiento
    var appData = {}; // Objeto para almacenar la respuesta de la API

    // Conexión a la base de datos
    database.connection.getConnection(function(err, connection) {
        if (err) {
            // Manejo de errores de conexión
            appData.error = 1;
            appData.data = "Error en el servidor interno";
            res.status(500).json(appData);
        } else {
            // Consulta SQL para verificar si el email existe en la base de datos
            connection.query('SELECT * FROM users WHERE email = ?', [email], function(err, rows) {
                if (err || rows.length === 0) {
                    // Si hay un error o el email no está registrado
                    appData.error = 1;
                    appData.data = "El correo no está registrado!";
                    res.status(400).json(appData);
                } else {
                    // Genera un token JWT con el email del usuario
                    var token = jwt.sign({ email: email }, process.env.SECRET_KEY, { expiresIn: '1h' });
                    // Enlace para restablecer la contraseña
                    var resetLink = `http://localhost:3000/resetPassword.html?token=${token}`;

                    // Opciones del correo electrónico
                    var mailOptions = {
                        from: 'alanfrancogodoy@gmail.com',
                        to: email,
                        subject: 'Restablecimiento de contraseña',
                        text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`
                    };

                    // Envía el correo electrónico de restablecimiento de contraseña
                    transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            console.error("Error al enviar el correo:", error); // Log de error
                            appData.error = 1;
                            appData.data = "No se pudo enviar el correo de restablecimiento!";
                            res.status(500).json(appData);
                        } else {
                            appData.error = 0;
                            appData.data = "Correo de restablecimiento enviado!";
                            res.status(200).json(appData);
                        }
                    });
                }
            });
            connection.release(); // Liberación de la conexión a la base de datos
        }
    });
});

// Endpoint POST '/resetPassword': Maneja el restablecimiento de contraseña
users.post('/resetPassword', function(req, res) {
    var token = req.body.token; // Token de restablecimiento de contraseña
    var newPassword = bcrypt.hashSync(req.body.password, 10); // Nueva contraseña encriptada
    var appData = {}; // Objeto para almacenar la respuesta de la API

    // Verifica el token JWT
    jwt.verify(token, process.env.SECRET_KEY, function(err, decoded) {
        if (err) {
            appData.error = 1;
            appData.data = "Token inválido o expirado!";
            res.status(400).json(appData);
        } else {
            var email = decoded.email; // Email extraído del token decodificado

            // Conexión a la base de datos
            database.connection.getConnection(function(err, connection) {
                if (err) {
                    appData.error = 1;
                    appData.data = "Error en el servidor interno";
                    res.status(500).json(appData);
                } else {
                    // Actualización de la contraseña en la base de datos
                    connection.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email], function(err, result) {
                        if (err) {
                            console.error("Error al actualizar la contraseña:", err);
                            appData.error = 1;
                            appData.data = "No se pudo restablecer la contraseña!";
                            res.status(500).json(appData);
                        } else {
                            console.log("Contraseña actualizada correctamente para el email:", email);
                            appData.error = 0;
                            appData.data = "Contraseña restablecida correctamente!";
                            res.status(200).json(appData);
                        }
                    });
                    connection.release(); // Liberación de la conexión a la base de datos
                }
            });
        }
    });
});

// Exporta el módulo 'users' para ser utilizado en otras partes de la aplicación
module.exports = users;
