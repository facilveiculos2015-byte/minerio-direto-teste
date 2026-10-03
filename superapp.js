/* Minera Pará — SUPERAPP (fase 1). Só liga quando MINERA_SUPERAPP (config.js) = true (hoje: só no TESTE).
 * - apps.html: "Hoje" (cards de resumo) + busca global + grade de apps + botão ➕ (ações rápidas)
 * - demais páginas: cabeçalho colorido do mini-app com botão "‹ Início"
 * - folha "Novo grupo" (busca pessoas → cria grupo) usada pelo ➕
 * Depende de: config.js (supabaseClient, APP_ROOT), auth-guard.js (ehAdmin), nav.js (MineraNotif).
 */
(function () {
    'use strict';
    if (typeof MINERA_SUPERAPP === 'undefined' || !MINERA_SUPERAPP) return;
    var R = (typeof APP_ROOT === 'string') ? APP_ROOT : '';
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function sb() { return window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null); }
    function brl(v) { try { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } catch (e) { return 'R$ ' + v; } }

    /* ---------- catálogo de apps ---------- */
    var APPS = [
        { id: 'marketplace', nome: 'Marketplace', sub: 'Comprar e vender', ico: '🛒', cor: '#F5A623', href: 'inicio.html', pags: ['inicio', 'lote-detalhe'] },
        { id: 'chat', nome: 'Chat', sub: 'Conversas', ico: '💬', cor: '#16a34a', href: 'chat.html', pags: ['chat'] },
        { id: 'banco', nome: 'Banco', sub: 'Caixa e Pix', ico: '🏦', cor: '#7c3aed', href: 'financeiro.html', pags: ['financeiro'] },
        { id: 'gestor', nome: 'Gestor', sub: 'Carradas e despesas', ico: '📒', cor: '#2563eb', href: 'gestor.html', pags: ['gestor'] },
        { id: 'frete', nome: 'Frete e Mapa', sub: 'Rotas e fretes', ico: '🚚', cor: '#0d9488', href: 'mapa.html', pags: ['frete', 'mapa'] },
        { id: 'lotes', nome: 'Meus Lotes', sub: 'Estoque e anúncios', ico: '📦', cor: '#b45309', href: 'lotes.html', pags: ['lotes', 'estoque', 'expedicao', 'britagem', 'relatorios'] },
        { id: 'perfil', nome: 'Perfil', sub: 'Sua conta', ico: '👤', cor: '#475569', href: 'perfil.html', pags: ['perfil'] },
        { id: 'suporte', nome: 'Fale conosco', sub: 'Suporte', ico: '🛟', cor: '#db2777', href: 'perfil.html#fale-conosco', pags: [] },
        { id: 'admin', nome: 'Admin', sub: 'Painel', ico: '🛡️', cor: '#dc2626', href: 'admin.html', pags: ['admin'], admin: true }
    ];
    function appDaPagina(pag) { for (var i = 0; i < APPS.length; i++) if (APPS[i].pags.indexOf(pag) >= 0) return APPS[i]; return null; }

    /* ---------- estado compartilhado ---------- */
    var perfil = null, uid = null, bankOn = null;
    function ehAdm() { return typeof ehAdmin === 'function' && ehAdmin(perfil); }
    async function bancoAtivo() {
        if (bankOn !== null) return bankOn;
        try {
            var r = await sb().from('app_flags').select('value_bool').eq('key', 'minera_bank_enabled').maybeSingle();
            bankOn = !(r.data && r.data.value_bool === false);
        } catch (e) { bankOn = true; }
        return bankOn;
    }

    /* ---------- cabeçalho do mini-app (todas as páginas menos apps.html) ---------- */
    function cabecalhoMiniApp(pag) {
        if (pag === 'apps' || pag === 'chat' || document.getElementById('sa-appbar')) return;
        var app = appDaPagina(pag); if (!app) return;
        document.documentElement.classList.add('sa-on');
        var bar = document.createElement('div');
        bar.id = 'sa-appbar'; bar.className = 'sa-appbar sa-app-' + app.id;
        bar.style.setProperty('--sa-cor', app.cor);
        bar.innerHTML = '<a class="sa-home" href="' + R + 'apps.html" aria-label="Voltar para o Início (apps)"><span aria-hidden="true">‹</span> Início</a>' +
            '<span class="sa-appbar-tit"><span class="sa-appbar-ico" aria-hidden="true">' + app.ico + '</span>' + esc(app.nome) + '</span>';
        document.body.insertBefore(bar, document.body.firstChild);
        document.body.classList.add('sa-has-appbar');
        var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', app.cor);
    }

    /* ---------- HOME (apps.html) ---------- */
    function cardHoje(id, ico, tit, val, sub, href, cor) {
        return '<a class="sa-hoje-card" id="' + id + '" href="' + R + href + '" style="--sa-cor:' + cor + '">' +
            '<span class="sa-hoje-ico" aria-hidden="true">' + ico + '</span>' +
            '<span class="sa-hoje-txt"><span class="sa-hoje-tit">' + esc(tit) + '</span><strong class="sa-hoje-val">' + val + '</strong>' +
            '<span class="sa-hoje-sub">' + esc(sub) + '</span></span></a>';
    }
    function setCard(id, val, sub) { var c = document.getElementById(id); if (!c) return; c.querySelector('.sa-hoje-val').innerHTML = val; if (sub != null) c.querySelector('.sa-hoje-sub').textContent = sub; }
    function setBadge(appId, n, txt) {
        var t = document.querySelector('.sa-app[data-app="' + appId + '"] .sa-badge'); if (!t) return;
        if (n > 0 || txt) { t.textContent = txt || (n > 99 ? '99+' : String(n)); t.classList.remove('oculto'); } else t.classList.add('oculto');
    }
    function renderHome() {
        var box = document.getElementById('sa-home'); if (!box) return;
        var nome = (perfil && (perfil.apelido || perfil.nome)) || '';
        var h = new Date().getHours(); var saud = h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite');
        var apps = APPS.filter(function (a) { return !a.admin || ehAdm(); });
        box.innerHTML =
            '<h1 class="sa-ola">' + saud + (nome ? ', ' + esc(nome.split(' ')[0]) : '') + '</h1>' +
            '<form class="sa-busca" id="sa-busca-form" role="search" onsubmit="return false">' +
            '<span aria-hidden="true">🔎</span><input type="search" id="sa-busca" placeholder="Buscar anúncios, pessoas, conversas, carradas…" autocomplete="off" aria-label="Busca geral"></form>' +
            '<div id="sa-busca-res" class="sa-busca-res oculto" aria-live="polite"></div>' +
            '<section id="sa-hoje" aria-label="Hoje"><h2 class="sa-sec">Hoje</h2><div class="sa-hoje-grid">' +
            cardHoje('sa-c-msgs', '💬', 'Mensagens', '…', 'não lidas', 'chat.html', '#16a34a') +
            cardHoje('sa-c-banco', '🏦', 'Banco', '…', 'saldo', 'financeiro.html', '#7c3aed') +
            cardHoje('sa-c-carradas', '📒', 'Carradas', '…', 'abertas', 'gestor.html', '#2563eb') +
            cardHoje('sa-c-novos', '🛒', 'Anúncios novos', '…', 'últimos 7 dias', 'inicio.html', '#F5A623') +
            '</div></section>' +
            '<section aria-label="Apps"><h2 class="sa-sec">Apps</h2><div class="sa-grid">' +
            apps.map(function (a) {
                return '<a class="sa-app" data-app="' + a.id + '" href="' + R + a.href + '" style="--sa-cor:' + a.cor + '">' +
                    '<span class="sa-app-ico" aria-hidden="true">' + a.ico + '<span class="sa-badge oculto"></span></span>' +
                    '<span class="sa-app-nome">' + esc(a.nome) + '</span></a>';
            }).join('') + '</div></section>';
        bindBusca();
        carregarHoje();
    }
    async function carregarHoje() {
        var s = sb(); if (!s || !uid) return;
        // mensagens não lidas: MineraNotif (nav.js) dispara 'minera:unread'
        function msgs(n) { setCard('sa-c-msgs', String(n), n === 1 ? 'não lida' : 'não lidas'); setBadge('chat', n); }
        try { if (window.MineraNotif && MineraNotif.count) msgs(MineraNotif.count()); } catch (e) { /* ignore */ }
        window.addEventListener('minera:unread', function (e) { msgs(Number(e.detail) || 0); });
        // Banco
        bancoAtivo().then(async function (on) {
            if (!on) { setCard('sa-c-banco', '—', 'Banco indisponível'); return; }
            try {
                var r = await s.from('caixa_saldos').select('saldo').eq('auth_id', uid).maybeSingle();
                var v = r && r.data ? Number(r.data.saldo || 0) : null;
                if (v == null) { setCard('sa-c-banco', 'Ativar', 'abra o Banco'); return; }
                var c = document.getElementById('sa-c-banco');
                setCard('sa-c-banco', '<span class="sa-oculto-val">R$ ••••</span>', 'toque no 👁 para ver');
                var eye = document.createElement('button'); eye.type = 'button'; eye.className = 'sa-eye'; eye.setAttribute('aria-label', 'Mostrar saldo'); eye.textContent = '👁';
                eye.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); var on2 = eye.classList.toggle('on'); setCard('sa-c-banco', on2 ? esc(brl(v)) : '<span class="sa-oculto-val">R$ ••••</span>', on2 ? 'saldo' : 'toque no 👁 para ver'); });
                if (c) c.appendChild(eye);
            } catch (e) { setCard('sa-c-banco', '—', 'saldo indisponível'); }
        });
        // Carradas abertas (Gestor)
        try {
            var rc = await s.from('gf_carradas').select('id', { count: 'exact', head: true }).eq('auth_id', uid).eq('status', 'aberta').is('deleted_at', null);
            var n = rc.count || 0; setCard('sa-c-carradas', String(n), n === 1 ? 'aberta' : 'abertas'); setBadge('gestor', n);
        } catch (e) { setCard('sa-c-carradas', '—', 'Gestor'); }
        // Anúncios novos (7 dias; mesma UF do perfil se houver)
        try {
            var desde = new Date(Date.now() - 7 * 864e5).toISOString();
            var q = s.from('lotes').select('id', { count: 'exact', head: true }).gte('data_entrada', desde);
            var uf = perfil && (perfil.estado || perfil.uf);
            if (uf) q = q.eq('estado', String(uf).toUpperCase());
            var rl = await q; var nl = rl.count || 0;
            setCard('sa-c-novos', String(nl), uf ? 'em ' + String(uf).toUpperCase() + ' · 7 dias' : 'últimos 7 dias');
            var visto = Number(localStorage.getItem('minera_sa_mkt_visto') || 0);
            if (nl && Date.now() - visto > 864e5) setBadge('marketplace', 0, 'novo');
        } catch (e) { setCard('sa-c-novos', '—', 'Marketplace'); }
    }

    /* ---------- busca global ---------- */
    var buscaT = null, buscaSeq = 0;
    function bindBusca() {
        var inp = document.getElementById('sa-busca'); if (!inp) return;
        inp.addEventListener('input', function () { clearTimeout(buscaT); buscaT = setTimeout(function () { buscar(inp.value.trim()); }, 320); });
    }
    function linha(href, ico, tit, sub) {
        return '<a class="sa-res" href="' + R + href + '"><span class="sa-res-ico" aria-hidden="true">' + ico + '</span><span class="sa-res-txt"><strong>' + esc(tit) + '</strong>' +
            (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span><span class="sa-res-chev" aria-hidden="true">›</span></a>';
    }
    async function buscar(t) {
        var box = document.getElementById('sa-busca-res'); if (!box) return;
        var hoje = document.getElementById('sa-hoje');
        if (t.length < 2) { box.classList.add('oculto'); box.innerHTML = ''; if (hoje) hoje.classList.remove('oculto'); return; }
        if (/@/.test(t)) { box.classList.remove('oculto'); box.innerHTML = '<p class="sub">Por segurança, não buscamos por e-mail. Use nome ou apelido.</p>'; return; }
        var seq = ++buscaSeq; var s = sb();
        box.classList.remove('oculto'); if (hoje) hoje.classList.add('oculto');
        box.innerHTML = '<p class="sub">Buscando “' + esc(t) + '”…</p>';
        var like = '%' + t.replace(/[%_,()]/g, ' ') + '%';
        var tasks = [
            s.from('lotes').select('codigo_lote,tipo_minerio,cidade,estado,preco,status').or('codigo_lote.ilike.' + like + ',tipo_minerio.ilike.' + like + ',cidade.ilike.' + like + ',origem.ilike.' + like).order('id', { ascending: false }).limit(6),
            s.rpc('chat_buscar_nome', { p_nome: t }),
            s.from('chat_mensagens').select('id,de_auth_id,para_auth_id,grupo_id,texto,criado_em').ilike('texto', like).is('deleted_at', null).order('id', { ascending: false }).limit(6),
            s.from('gf_carradas').select('id,data,minerio,comprador,placa,status,valor_venda').eq('auth_id', uid).is('deleted_at', null).or('comprador.ilike.' + like + ',minerio.ilike.' + like + ',placa.ilike.' + like + ',observacao.ilike.' + like).order('data', { ascending: false }).limit(5),
            s.from('gf_lancamentos').select('id,data,descricao,valor,tipo').eq('auth_id', uid).is('deleted_at', null).ilike('descricao', like).order('data', { ascending: false }).limit(5)
        ].map(function (p) { return Promise.resolve(p).catch(function (e) { return { error: e }; }); });
        var r = await Promise.all(tasks);
        if (seq !== buscaSeq) return;
        var html = '';
        var lotes = (r[0] && r[0].data) || [];
        if (lotes.length) html += '<h3 class="sa-res-h">🛒 Anúncios</h3>' + lotes.map(function (l) {
            return linha('lote-detalhe.html?codigo=' + encodeURIComponent(l.codigo_lote), '🛒', (l.tipo_minerio || 'Anúncio') + ' · ' + l.codigo_lote, [l.cidade, l.estado].filter(Boolean).join('/') + (l.preco ? ' · ' + brl(l.preco) : ''));
        }).join('');
        var pessoas = ((r[1] && r[1].data) || []).filter(function (u) { return u.auth_id !== uid; }).slice(0, 6);
        if (pessoas.length) html += '<h3 class="sa-res-h">👤 Pessoas</h3>' + pessoas.map(function (u) {
            return linha('chat.html?com=' + encodeURIComponent(u.auth_id), '👤', u.apelido || u.nome || 'Usuário', (u.apelido && u.nome && u.apelido !== u.nome ? u.nome : 'Abrir conversa'));
        }).join('');
        var msgs = (r[2] && r[2].data) || [];
        if (msgs.length) html += '<h3 class="sa-res-h">💬 Conversas</h3>' + msgs.map(function (m) {
            var href = m.grupo_id ? 'chat.html?grupo=' + m.grupo_id : 'chat.html?com=' + encodeURIComponent(m.de_auth_id === uid ? m.para_auth_id : m.de_auth_id);
            var quando = m.criado_em ? new Date(m.criado_em).toLocaleDateString('pt-BR') : '';
            return linha(href, '💬', String(m.texto || '').slice(0, 70), (m.grupo_id ? 'Grupo · ' : '') + quando);
        }).join('');
        var car = (r[3] && r[3].data) || [], lan = (r[4] && r[4].data) || [];
        if (car.length || lan.length) html += '<h3 class="sa-res-h">📒 Gestor</h3>' +
            car.map(function (c) { return linha('gestor.html#carrada=' + c.id, '🚛', 'Carrada ' + (c.minerio || '') + (c.comprador ? ' · ' + c.comprador : ''), (c.data || '') + ' · ' + c.status + (c.valor_venda ? ' · ' + brl(c.valor_venda) : '')); }).join('') +
            lan.map(function (l) { return linha('gestor.html', l.tipo === 'entrada' ? '➕' : '➖', l.descricao || 'Lançamento', (l.data || '') + ' · ' + brl(l.valor)); }).join('');
        box.innerHTML = html || '<p class="sub">Nada encontrado para “' + esc(t) + '”.</p>';
    }

    /* ---------- ➕ ações rápidas ---------- */
    function garantirFab() {
        if (document.getElementById('sa-fab')) return;
        var b = document.createElement('button'); b.type = 'button'; b.id = 'sa-fab'; b.className = 'sa-fab'; b.setAttribute('aria-label', 'Ações rápidas'); b.textContent = '＋';
        b.addEventListener('click', abrirAcoes);
        document.body.appendChild(b);
    }
    async function abrirAcoes() {
        var on = await bancoAtivo();
        var itens = [
            { ico: '🛒', t: 'Novo anúncio', href: 'lotes.html?novo=1' },
            { ico: '➖', t: 'Lançar despesa', href: 'gestor.html#nova-despesa' },
            { ico: '🚛', t: 'Abrir carrada', href: 'gestor.html#nova-carrada' }
        ];
        if (on) itens.push({ ico: '⚡', t: 'Pix', href: 'financeiro.html#pix' });
        itens.push({ ico: '👥', t: 'Novo grupo', acao: abrirNovoGrupo });
        folha('sa-acoes', 'O que você quer fazer?', itens.map(function (it, i) {
            return it.href ? '<a class="sa-acao" href="' + R + it.href + '"><span aria-hidden="true">' + it.ico + '</span>' + esc(it.t) + '</a>'
                : '<button type="button" class="sa-acao" data-i="' + i + '"><span aria-hidden="true">' + it.ico + '</span>' + esc(it.t) + '</button>';
        }).join(''), function (painel) {
            painel.querySelectorAll('button.sa-acao').forEach(function (bt) { bt.addEventListener('click', function () { fecharFolha('sa-acoes'); itens[Number(bt.getAttribute('data-i'))].acao(); }); });
        });
    }
    function folha(id, titulo, html, after) {
        fecharFolha(id);
        var w = document.createElement('div'); w.id = id; w.className = 'sa-folha'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', titulo);
        w.innerHTML = '<div class="sa-folha-fundo" data-fechar="1"></div><div class="sa-folha-painel"><div class="sa-folha-top"><h2>' + esc(titulo) + '</h2>' +
            '<button type="button" class="sa-folha-x" data-fechar="1" aria-label="Fechar">✕</button></div><div class="sa-folha-corpo">' + html + '</div></div>';
        w.addEventListener('click', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-fechar')) fecharFolha(id); });
        document.body.appendChild(w);
        if (after) after(w.querySelector('.sa-folha-painel'));
        return w;
    }
    function fecharFolha(id) { var o = document.getElementById(id); if (o) o.remove(); }

    /* ---------- novo grupo ---------- */
    function abrirNovoGrupo() {
        var sel = {};
        folha('sa-grupo', 'Novo grupo',
            '<label class="sa-lbl" for="sa-g-nome">Nome do grupo</label><input id="sa-g-nome" class="sa-inp" maxlength="60" placeholder="Ex.: Carga de manganês">' +
            '<label class="sa-lbl" for="sa-g-busca">Adicionar pessoas</label><input id="sa-g-busca" class="sa-inp" type="search" placeholder="Nome ou apelido" autocomplete="off">' +
            '<div id="sa-g-lista" class="sa-g-lista"><p class="sub">Digite um nome para buscar.</p></div>' +
            '<p id="sa-g-msg" class="msg"></p><button type="button" class="sa-btn-grande" id="sa-g-criar" disabled>Criar grupo</button>',
            function (p) {
                var inp = p.querySelector('#sa-g-busca'), lista = p.querySelector('#sa-g-lista'), btn = p.querySelector('#sa-g-criar'), t = null;
                function atual() { var n = Object.keys(sel).length; btn.disabled = n < 1; btn.textContent = n ? 'Criar grupo (' + (n + 1) + ' pessoas)' : 'Criar grupo'; }
                inp.addEventListener('input', function () {
                    clearTimeout(t); t = setTimeout(async function () {
                        var q = inp.value.trim(); if (q.length < 2 || /@/.test(q)) return;
                        var r = await sb().rpc('chat_buscar_nome', { p_nome: q });
                        var us = ((r && r.data) || []).filter(function (u) { return u.auth_id !== uid; });
                        lista.innerHTML = us.length ? us.map(function (u) {
                            var nome = u.apelido || u.nome || 'Usuário';
                            return '<label class="sa-g-item"><input type="checkbox" data-id="' + esc(u.auth_id) + '" data-nome="' + esc(nome) + '"' + (sel[u.auth_id] ? ' checked' : '') + '><span>' + esc(nome) + '</span></label>';
                        }).join('') : '<p class="sub">Ninguém encontrado.</p>';
                        lista.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
                            cb.addEventListener('change', function () { var id = cb.getAttribute('data-id'); if (cb.checked) sel[id] = cb.getAttribute('data-nome'); else delete sel[id]; atual(); });
                        });
                    }, 300);
                });
                btn.addEventListener('click', async function () {
                    var ids = Object.keys(sel); if (!ids.length) return;
                    var nome = p.querySelector('#sa-g-nome').value.trim() || ids.map(function (k) { return sel[k]; }).join(', ').slice(0, 60);
                    btn.disabled = true; btn.textContent = 'Criando…';
                    var r = await sb().rpc('chat_grupo_criar', { p_nome: nome, p_membros: ids });
                    if (r.error || !r.data) { p.querySelector('#sa-g-msg').textContent = 'Não foi possível criar: ' + ((r.error && r.error.message) || ''); atual(); return; }
                    location.href = R + 'chat.html?grupo=' + encodeURIComponent(r.data);
                });
            });
    }

    /* ---------- Banco: financeiro.html#pix / #pagar abre a tela certa ---------- */
    function deepLinkBanco() {
        var v = (location.hash || '').replace('#', '');
        if (!/^(pix|pagar|depositar|extrato|sacar|emprestimos)$/.test(v)) return;
        var tries = 0;
        (function tenta() {
            var b = document.querySelector('[data-view="' + v + '"]');
            if (b && b.offsetParent !== null) { b.click(); return; }
            if (++tries < 40) setTimeout(tenta, 250);
        })();
    }

    /* ---------- Chat ↔ anúncio ↔ Gestor/Banco ---------- */
    var loteCardSeq = 0;
    async function loteNoChat(codigo, peer, ctxEl) {
        if (!ctxEl) return;
        var seq = ++loteCardSeq;
        if (!codigo) { if (ctxEl.querySelector('.sa-lote-card')) { ctxEl.innerHTML = ''; ctxEl.classList.add('oculto'); } return; }
        var r = await sb().from('lotes').select('codigo_lote,tipo_minerio,teor,preco,cidade,estado,imagem_url,fotos,criado_por_id,criado_por').eq('codigo_lote', codigo).maybeSingle().catch(function () { return {}; });
        if (seq !== loteCardSeq) return;
        var l = r && r.data;
        if (!l) return;
        var foto = l.imagem_url || (Array.isArray(l.fotos) && l.fotos[0]) || '';
        var souDono = l.criado_por_id && l.criado_por_id === uid;
        var info = [l.teor != null ? 'teor ' + String(l.teor).replace('.', ',') + '%' : '', l.preco ? brl(l.preco) : '', [l.cidade, l.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ');
        ctxEl.classList.remove('oculto');
        ctxEl.classList.add('sa-lote-ctx');
        ctxEl.innerHTML = '<a class="sa-lote-card" href="' + R + 'lote-detalhe.html?codigo=' + encodeURIComponent(l.codigo_lote) + '">' +
            (foto ? '<img src="' + esc(foto) + '" alt="">' : '<img alt="" src="' + R + 'logo-escavadeira.png">') +
            '<span class="sa-lote-txt"><strong>' + esc((l.tipo_minerio || 'Anúncio') + ' · ' + l.codigo_lote) + '</strong><span>' + esc(info || (souDono ? 'Seu anúncio' : 'Anúncio de ' + (l.criado_por || 'usuário'))) + '</span></span></a>' +
            '<div class="sa-lote-bts"><button type="button" class="sa-chip-btn sa-pri" id="sa-abrir-carrada">📒 Abrir carrada</button>' +
            (souDono ? '' : '<a class="sa-chip-btn sa-banco" id="sa-pagar-banco" href="' + R + 'financeiro.html#pagar">🏦 Pagar pelo Banco</a>') + '</div>';
        ctxEl.querySelector('#sa-abrir-carrada').addEventListener('click', function () {
            var peerNome = '';
            try { peerNome = (document.getElementById('chat-com-nome') || {}).textContent || ''; } catch (e) { /* ignore */ }
            var meuNome = (perfil && (perfil.apelido || perfil.nome)) || '';
            var pre = {
                minerio: l.tipo_minerio || null,
                comprador: (souDono ? peerNome : meuNome) || null,
                teor: l.teor != null ? Number(l.teor) : null,
                observacao: 'Lote ' + l.codigo_lote + (l.preco ? ' · preço do anúncio ' + brl(l.preco) + ' (confira a unidade)' : '') + (peerNome ? ' · conversa com ' + peerNome : '')
            };
            if (l.preco) { pre.preco_modo = 'tonelada'; pre.preco_t_informado = Number(l.preco); pre.preco_manual = true; }
            try { sessionStorage.setItem('minera_carrada_prefill', JSON.stringify(pre)); } catch (e) { /* ignore */ }
            location.href = R + 'gestor.html#nova-carrada';
        });
    }

    /* ---------- API ---------- */
    window.MineraSuperApp = {
        apps: APPS,
        iniciar: function (pag, p) {
            perfil = p || perfil; uid = (perfil && perfil.auth_id) || uid;
            document.documentElement.classList.add('sa-on');
            if (pag === 'apps') { renderHome(); garantirFab(); }
            else cabecalhoMiniApp(pag);
            if (pag === 'inicio') try { localStorage.setItem('minera_sa_mkt_visto', String(Date.now())); } catch (e) { /* ignore */ }
            if (pag === 'financeiro') deepLinkBanco();
            if (pag === 'chat') {
                var bk = document.getElementById('btn-chat-list-back');
                if (bk && !bk._sa) { bk._sa = 1; bk.setAttribute('aria-label', 'Voltar para o Início (apps)'); bk.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); location.href = R + 'apps.html'; }, true); }
                if (/[?&]novo_grupo=1/.test(location.search)) setTimeout(abrirNovoGrupo, 400);
            }
        },
        novoGrupo: abrirNovoGrupo,
        loteNoChat: loteNoChat,
        bancoAtivo: bancoAtivo
    };
})();
