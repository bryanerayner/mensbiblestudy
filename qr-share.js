(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .qr-share-button {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      background: #1f2937;
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 0.85rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 999;
    }

    .qr-share-button:hover,
    .qr-share-button:focus {
      transform: translateY(-2px);
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.3);
      outline: none;
    }

    .qr-share-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .qr-share-overlay.visible {
      opacity: 1;
      pointer-events: auto;

    opacity: 1;
    pointer-events: auto;
    z-index: 9999999999999999;
    }

    .qr-share-content {
      position: relative;
      background: #ffffff;
      padding: 2.5rem 2rem 2rem;
      border-radius: 16px;
      max-width: min(90vw, 420px);
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.35);

        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        align-content: center;
        vertical-align: center;
        box-sizing: border-box;
        padding: 0;
        max-width: 100vw;
        max-height: 100vh;
    }

    .qr-share-close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: transparent;
      border: none;
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;
      color: #1f2937;
    }

    .qr-share-url {
      font-size: 0.85rem;
      word-break: break-all;
      color: #4b5563;
      text-align: center;
      margin: 0;
    }

    @media (max-width: 600px) {
      .qr-share-content {
        padding: 2rem 1.5rem 1.5rem;
      }

      .qr-share-button {
        right: 1rem;
        bottom: 1rem;
        padding: 0.75rem 1.25rem;
      }
    }
  `;
  document.head.appendChild(style);

  function init() {
    if (typeof QRCode === 'undefined') {
      console.warn('QRCode library not found.');
      return;
    }

    const button = document.createElement('button');
    button.className = 'qr-share-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Show QR code for this page');
    button.textContent = 'Share via QR';

    const overlay = document.createElement('div');
    overlay.className = 'qr-share-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'qr-share-content';

    const closeButton = document.createElement('button');
    closeButton.className = 'qr-share-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close QR code');
    closeButton.innerHTML = '&times;';

    const qrContainer = document.createElement('div');
    qrContainer.id = 'qr-share-code';

    const urlText = document.createElement('p');
    urlText.className = 'qr-share-url';
    urlText.textContent = window.location.href;

    content.appendChild(closeButton);
    content.appendChild(qrContainer);
    content.appendChild(urlText);
    overlay.appendChild(content);

    document.body.appendChild(button);
    document.body.appendChild(overlay);

    const qr = new QRCode(qrContainer, {
      text: window.location.href,
      width: 320,
      height: 320,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    function showOverlay() {
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
      closeButton.focus();
    }

    function hideOverlay() {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      button.focus();
    }

    button.addEventListener('click', showOverlay);
    closeButton.addEventListener('click', hideOverlay);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        hideOverlay();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('visible')) {
        hideOverlay();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
