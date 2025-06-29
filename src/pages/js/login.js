document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const resposta = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      mostrarToast(dados.mensagem, 'sucesso');
      localStorage.setItem('token', dados.token);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      mostrarToast(dados.mensagem || 'Erro ao entrar.', 'erro');
    }
  } catch (err) {
    mostrarToast('Erro de ligação ao servidor.', 'erro');
  }
}); 