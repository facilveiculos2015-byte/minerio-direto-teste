/* MineraBank (classic) aberto em tela cheia dentro do app. Login separado: nenhum token do Minera Pará é enviado ao banco. */
(function () {
  var URL_BANCO = 'https://mbclassic.200-141-19-63.sslip.io/';
  function abrir() {
    if (document.getElementById('mb-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'mb-overlay'; ov.className = 'mb-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'MineraBank');
    var bar = document.createElement('div'); bar.className = 'mb-bar';
    var fechar = document.createElement('button'); fechar.type = 'button'; fechar.className = 'btn-sm'; fechar.textContent = '‹ Voltar ao Minera Pará';
    var nova = document.createElement('a'); nova.href = URL_BANCO; nova.target = '_blank'; nova.rel = 'noopener noreferrer'; nova.className = 'mb-nova'; nova.textContent = 'Abrir em nova aba';
    bar.appendChild(fechar); bar.appendChild(nova);
    var fr = document.createElement('iframe');
    fr.src = URL_BANCO; fr.title = 'MineraBank'; fr.className = 'mb-frame';
    fr.setAttribute('allow', 'publickey-credentials-get *; publickey-credentials-create *; camera; clipboard-write');
    fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    ov.appendChild(bar); ov.appendChild(fr); document.body.appendChild(ov);
    document.documentElement.classList.add('mb-aberto');
    function sair() { ov.remove(); document.documentElement.classList.remove('mb-aberto'); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') sair(); }
    fechar.addEventListener('click', sair); document.addEventListener('keydown', esc);
  }
  var b = document.getElementById('btn-abrir-minerabank');
  if (b) b.addEventListener('click', abrir);
})();
