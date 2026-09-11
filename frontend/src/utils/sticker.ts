export function showSuccessSticker(type: 'income' | 'expense') {
  // Prevent multiple stickers from stacking aggressively
  const existing = document.getElementById('success-sticker-container');
  if (existing) {
    existing.remove();
  }

  const container = document.createElement('div');
  container.id = 'success-sticker-container';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';

  const sticker = document.createElement('div');
  const isDark = document.documentElement.classList.contains('dark');
  sticker.style.background = isDark ? '#1f2937' : '#ffffff';
  sticker.style.color = isDark ? '#f9fafb' : '#111827';
  sticker.style.borderRadius = '1.5rem';
  sticker.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
  sticker.style.padding = '2rem 3rem';
  sticker.style.display = 'flex';
  sticker.style.flexDirection = 'column';
  sticker.style.alignItems = 'center';
  sticker.style.gap = '1rem';
  sticker.style.animation = 'sticker-pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, sticker-fade-out 0.5s ease-in 1.5s forwards';

  const icon = document.createElement('div');
  icon.style.fontSize = '5rem';
  icon.style.lineHeight = '1';
  icon.style.animation = 'sticker-bounce 1s infinite';
  icon.innerText = type === 'income' ? '🤑' : '💸';

  const text = document.createElement('div');
  text.style.fontSize = '1.5rem';
  text.style.fontWeight = 'bold';
  text.style.color = type === 'income' ? '#10b981' : '#ef4444'; // emerald-500 or red-500
  text.innerText = type === 'income' ? 'Money Added! 💰' : 'Expense Added! 💸';

  sticker.appendChild(icon);
  sticker.appendChild(text);
  container.appendChild(sticker);

  document.body.appendChild(container);

  // Clean up
  setTimeout(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }, 2500);
}
