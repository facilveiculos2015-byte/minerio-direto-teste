# Minério Direto — AMBIENTE DE TESTE

Cópia de teste do app Minera Pará (repo de produção: `facilveiculos2015-byte/minera-app`, domínio `minerapara.com.br`).

- URL de teste: https://facilveiculos2015-byte.github.io/minerio-direto-teste/
- Sem arquivo `CNAME` (de propósito). Caminhos relativos → também roda na raiz de um site Netlify.
- O ambiente é detectado pelo hostname em `config.js` (fora de `minerapara.com.br` = teste → faixa vermelha
  "AMBIENTE DE TESTE — Minério Direto"). O mesmo código promovido para produção não mostra a faixa.
- Banco: `MINERA_DB.teste` em `config.js`. Enquanto for `null`, o teste usa o banco de PRODUÇÃO (dados reais!).
- Promover para produção: `/workspace/minera-teste-setup/promover.sh` (revisar antes).
