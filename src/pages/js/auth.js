function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  let icon = '';
  if (tipo === 'sucesso') icon = '<i class="fa-solid fa-circle-check toast-icon"></i>';
  else if (tipo === 'erro') icon = '<i class="fa-solid fa-circle-xmark toast-icon"></i>';
  else icon = '<i class="fa-solid fa-circle-info toast-icon"></i>';
  toast.innerHTML = icon + mensagem;
  toast.className = 'toast show';
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
} 