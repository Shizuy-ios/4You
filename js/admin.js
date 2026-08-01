const adminForm = document.getElementById('admin-form');

function agregarPoema() {
  if (!adminForm) return;

  const title = document.getElementById('admin-title').value.trim();
  const date = document.getElementById('admin-date').value;
  const poem = document.getElementById('admin-poem').value.trim();

  if (!title || !date || !poem) {
    alert('Completa título, fecha y texto del poema.');
    return;
  }

  const payload = {
    titulo: title,
    fecha: date,
    autor: 'Brandon',
    poema: poem,
    imagen: 'images/diary-cover.svg',
    musica: 'music/soft-piano-1.mp3',
    color: '#b48a62'
  };

  const fileName = `${date}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const manifest = JSON.parse(localStorage.getItem('para-ti-local-poems') || '[]');
  manifest.push(payload);
  localStorage.setItem('para-ti-local-poems', JSON.stringify(manifest));

  alert(`Poema preparado para guardar como ${fileName}.`);
  adminForm.reset();
}

if (adminForm) {
  adminForm.addEventListener('submit', (event) => {
    event.preventDefault();
    agregarPoema();
  });
}
