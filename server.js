var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var path = require('path'); 
var app = express();
var port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para la página principal
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Importa las rutas definidas en './Routes/Users'
var Users = require('./Routes/Users');

// Define la ruta base '/users' para las rutas definidas en Users
app.use('/users', Users);

// Configura el servidor para escuchar en el puerto especificado o en el puerto 3000 por defecto
app.listen(port, function() {
    console.log("Servidor corriendo en el puerto: " + port);
});
