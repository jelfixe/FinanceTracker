document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const nome = document.getElementById('nome').value;
  const dataNascimento = document.getElementById('dataNascimento').value;
  if (!email || !password || !nome || !dataNascimento) {
    mostrarToast('Por favor, preencha todos os campos.', 'erro');
    return;
  }
  try {
    const resposta = await fetch('http://localhost:3000/api/registar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nome, dataNascimento })
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      mostrarToast(dados.mensagem, 'sucesso');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      mostrarToast(dados.mensagem || 'Erro ao registar.', 'erro');
    }
  } catch (err) {
    mostrarToast('Erro de ligação ao servidor.', 'erro');
  }
}); 