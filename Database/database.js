var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 10,
    host:'localhost',
    user:'root',
    password:'',
    database:'conectarlab_login',
    port: 3306,
});

module.exports =  {
    connection: connection
};