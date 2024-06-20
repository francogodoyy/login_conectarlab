//Funcionalidades dinámicas del cliente
document.getElementById('changePasswordForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    fetch('/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword })
    })
    .then(response => response.text())
    .then(message => {
        document.getElementById('message').innerText = message;
    })
    .catch(error => console.error('Error:', error));
});
