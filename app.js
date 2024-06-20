// Este es el archivo principal donde se configura y se ejecuta mi servidor Express
const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Creamos la conexión a la base de datos MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'login_conectarlab'
});

// Conectamos a la base de datos y mostramos un mensaje si se conecta correctamente
connection.connect(function (err) {
    if (err) {
        console.error('Error conectándose a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conectado a la base de datos');
});

// Inicializamos la aplicación Express
const app = express();

// Configuramos el uso de sesiones en la aplicación
app.use(session({
    secret: 'secret',  // Clave secreta para firmar la sesión
    resave: true,  // Vuelve a guardar la sesión incluso si no ha sido modificada
    saveUninitialized: true  // Guarda la sesión nueva aunque no haya sido inicializada
}));

// Middleware para parsear JSON y datos codificados en URL
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuramos el servidor para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '/public')));

// Enrutador de Express directamente integrado desde index.js
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/login.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/forgot-password.html'));
});

app.get('/change-password', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/change-password.html'));
});

// Ruta para servir el formulario de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/register.html'));
});

// Ruta para servir el formulario de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/register.html'));
});

// Ruta para procesar el registro de usuario
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Validación básica
    if (username && password) {
        // Hashear la contraseña antes de guardarla en la base de datos
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insertar el nuevo usuario en la base de datos
        connection.query('INSERT INTO admins (username, password) VALUES (?, ?)', [username, hashedPassword], (error, results) => {
            if (error) {
                console.error('Error al registrar usuario:', error);
                res.status(500).send('Error interno en el servidor');
            } else {
                console.log('Usuario registrado exitosamente:', username);
                res.send('¡Usuario registrado exitosamente!');
            }
            res.end();
        });
    } else {
        res.status(400).send('Por favor completa todos los campos');
    }
});


app.post('/auth', function(request, response) {
	
	let username = request.body.username;
	let password = request.body.password;
	
	if (username && password) {
		
		connection.query('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			
			if (error) throw error;
			
			if (results.length > 0) {
				
				request.session.loggedin = true;
				request.session.username = username;
				
				response.redirect('/home');
			} else {
				response.send('Usuario y/o Contraseña Incorrecta');
			}			
			response.end();
		});
	} else {
		response.send('Por favor ingresa Usuario y Contraseña!');
		response.end();
	}
});



app.post('/forgot-password', (req, res) => {
    const username = req.body.username;

    if (username) {
        connection.query('SELECT * FROM admins WHERE username = ?', [username], (error, results) => {
            if (error) throw error;
            if (results.length > 0) {
                const userEmail = results[0].email;
                const token = crypto.randomBytes(20).toString('hex');
                const tokenExpiration = Date.now() + 3600000; //1 h de validez

                connection.query('UPDATE admins SET resetPasswordToken = ?, resetPasswordExpires = ?, WHERE username = ?', [token, tokenExpiration, username], (error) => {
                    if (error) throw error;

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'alanfrancogodoy@gmail.com',
                            pass: 'qrzd kzzf frag ivtz'
                        }
                    });

                    const mailOptions = {
                        from: 'alanfrancogodoy@gmail.com',
                        to: userEmail,
                        subject: 'Recuperación de contraseña',
                        text: `Está recibiendo esto porque usted (o alguien más) ha solicitado el restablecimiento de la contraseña de su cuenta.\n\n` +
                              `Haga clic en el siguiente enlace, o copie y pegue en su navegador para completar el proceso:\n\n` +
                              `http://${req.headers.host}/reset-password/${token}\n\n` +
                              `Si usted no solicitó esto, por favor ignore este correo y su contraseña permanecerá sin cambios.\n`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error enviando el correo: ' + error);
                            res.send('Error enviando el correo.');
                        } else {
                            console.log('Correo enviado: ' + info.response);
                            res.send('Nueva contraseña enviada a tu correo electrónico.');
                        }
                        res.end();
                    });
                });
            } else {
                res.send('Usuario no encontrado.');
                res.end();
            }
        });
    } else {
        res.send('Por favor ingresa tu nombre de usuario!');
        res.end();
    }
});

app.get('/reset-password/:token', (req, res) => {
    const token = req.params.token;

    connection.query('SELECT * FROM admins WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.sendFile(path.join(__dirname, '/views/reset-password.html'));
        } else {
            res.send('Token inválido o expirado');
        }
    });
});

app.post('/reset-password/:token', (req, res) => {
    const token = req.params.token;
    const { password } = req.body;

    connection.query('SELECT * FROM admins WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            connection.query('UPDATE admins SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE resetPasswordToken = ?', [hashedPassword, token], (error ) => {
                if (error) throw error;
                res.send('Contraseña actualizada correctamente.');
            });
        } else {
            res.send('Token inválido o expirado')
        }
    });
});

app.post('/change-password', (req, res) => {
    if (req.session.loggedin) {
        const { oldPassword, newPassword } = req.body;

        if (oldPassword && newPassword) {
            connection.query('SELECT * FROM admins WHERE username = ?', [req.session.username], (error, results) => {
                if (error) throw error;

                if (results.length > 0) {
                    const hashedOldPassword = results[0].password;

                    bcrypt.compare(oldPassword, hashedOldPassword, (err, result) => {
                        if (result) {
                            const hashedNewPassword = bcrypt.hashSync(newPassword, 10); 

                            connection.query('UPDATE admins SET password = ? WHERE username = ?', [hashedNewPassword, req.session.username], (error) => {
                                if (error) throw error;

                                res.send('Contraseña actualizada exitosamente.');
                                res.end();
                            });
                        } else {
                            res.send('La contraseña antigua no es correcta.');
                            res.end();
                        }
                    });
                } else {
                    res.send('Usuario no encontrado.');
                    res.end();
                }
            });
        } else {
            res.send('Por favor ingresa la contraseña antigua y la nueva contraseña.');
            res.end();
        }
    } else {
        res.send('Por favor inicia sesión primero.');
        res.end();
    }
});



app.get('/home', function(request, response) {
	
	if (request.session.loggedin) {
		
		response.send('Te has logueado satisfactoriamente:, ' + request.session.username + '!');
	} else {
		
		response.send('¡Inicia sesión para ver esta página!');
	}
	response.end();
});


// Configuramos el servidor para que escuche en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
