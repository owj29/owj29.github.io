const storagePrefix = 'oliver-johnson-portfolio-v2:';
const photoKey = (id) => `${storagePrefix}photo:${id}`;
const captionKey = (id) => `${storagePrefix}caption:${id}`;

function readSaved(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function setPhoto(id, dataUrl) {
  const image = id === 'portrait'
    ? document.querySelector('#portrait-preview')
    : document.querySelector(`[data-gallery-card="${id}"] .gallery-photo`);
  const placeholder = id === 'portrait'
    ? document.querySelector('#portrait-placeholder')
    : document.querySelector(`[data-gallery-card="${id}"] .gallery-placeholder`);
  const clearButton = document.querySelector(`[data-clear-photo="${id}"]`);
  const label = document.querySelector(`[data-upload-label="${id}"]`);
  if (!image) return;

  image.hidden = !dataUrl;
  if (dataUrl) image.src = dataUrl;
  else image.removeAttribute('src');
  if (placeholder) placeholder.hidden = Boolean(dataUrl);
  if (clearButton) clearButton.hidden = !dataUrl;
  if (label) label.textContent = dataUrl ? 'Change photo' : 'Choose photo';
}

function updateStatus(input, message) {
  const status = input.id === 'portrait-upload'
    ? document.querySelector('#portrait-status')
    : input.closest('figure')?.querySelector('.upload-status');
  if (status) status.textContent = message;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('This browser could not prepare the image.'));
        return;
      }
      context.fillStyle = '#f8f7f2';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('This image could not be prepared. Try another one.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('This image could not be read.'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.84);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be opened as an image.'));
    };
    image.src = url;
  });
}

document.querySelectorAll('[data-open-upload]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.openUpload)?.click());
});

document.querySelectorAll('.file-input').forEach((input) => {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const id = input.id === 'portrait-upload' ? 'portrait' : input.id.replace('gallery-', '');
    if (!file.type.startsWith('image/')) {
      updateStatus(input, 'Choose an image file.');
      input.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      updateStatus(input, 'Choose an image smaller than 20 MB.');
      input.value = '';
      return;
    }

    updateStatus(input, 'Preparing photo…');
    try {
      const dataUrl = await resizeImage(file);
      setPhoto(id, dataUrl);
      try {
        window.localStorage.setItem(photoKey(id), dataUrl);
        updateStatus(input, 'Saved in this browser.');
      } catch {
        updateStatus(input, 'Photo shown here, but browser storage is full.');
      }
    } catch (error) {
      updateStatus(input, error.message || 'This photo could not be loaded.');
    }
    input.value = '';
  });
});

document.querySelectorAll('[data-clear-photo]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.clearPhoto;
    setPhoto(id, null);
    try { window.localStorage.removeItem(photoKey(id)); } catch { /* Storage is optional. */ }
    const input = id === 'portrait' ? document.querySelector('#portrait-upload') : document.querySelector(`#gallery-${id}`);
    if (input) updateStatus(input, 'Photo removed from this browser.');
  });
});

document.querySelectorAll('.caption-editor').forEach((caption) => {
  const savedCaption = readSaved(captionKey(caption.dataset.caption));
  if (savedCaption !== null) caption.value = savedCaption;
  caption.addEventListener('input', () => {
    try { window.localStorage.setItem(captionKey(caption.dataset.caption), caption.value); } catch { /* Keep the caption editable if storage is unavailable. */ }
  });
});

['portrait', 'poster', 'trails', 'swim'].forEach((id) => {
  const photo = readSaved(photoKey(id));
  if (photo) setPhoto(id, photo);
});
