"""Gera laudo/laudo.html a partir dos arquivos de logs/ (o PDF é impresso a partir dele).

Todos os números do laudo são lidos aqui de logs/<rodada>/resumo.json,
serie_por_segundo.csv e dos .jsonl brutos; nenhum é digitado à mão.

Uso (na pasta laudo-incidente-gcp):  python laudo/gerar_laudo.py
"""

import csv
import glob
import json
import os
from pathlib import Path
from statistics import mean

RAIZ = Path(__file__).resolve().parent.parent
LOGS = RAIZ / "logs"
ESTRATEGIAS = ["sem_backoff", "exponencial", "exponencial_jitter"]
NOME = {"sem_backoff": "Sem backoff", "exponencial": "Exponencial", "exponencial_jitter": "Exponencial + jitter"}
COR = {"sem_backoff": "#c0392b", "exponencial": "#b9770e", "exponencial_jitter": "#1e8449"}


def br(x, casas=1):
    if isinstance(x, int):
        return f"{x:,}".replace(",", ".")
    return f"{x:.{casas}f}".replace(".", ",")


def ler_jsonl(caminho):
    with open(caminho, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


# ------------------------------------------------------------------ dados
rod = {}
for p in sorted(LOGS.glob("*/resumo.json")):
    r = json.loads(p.read_text(encoding="utf-8"))
    if r.get("valida") and r.get("banco_custo_carga_s") == 0.25:
        rod[r["rodada"]] = r
calib = json.loads((LOGS / "calibracao-custo-0.1" / "resumo.json").read_text(encoding="utf-8"))
por = {e: [rod[k] for k in sorted(rod) if rod[k]["estrategia"] == e] for e in ESTRATEGIAS}


def espalhamento_crashes(rodada):
    """Do instante da injeção até o 1º crash de cada réplica (s): mínimo e máximo."""
    pasta = LOGS / rodada
    t_inj = next(l["t"] for l in ler_jsonl(pasta / "banco.jsonl") if l["evento"] == "politica_com_campo_vazio_inserida")
    primeiros = []
    for arq in pasta.glob("service-control-*.jsonl"):
        crashes = [l["t"] for l in ler_jsonl(arq) if l["evento"] == "crash"]
        if crashes:
            primeiros.append(min(crashes) - t_inj)
    return min(primeiros), max(primeiros)


def serie(rodada):
    with open(LOGS / rodada / "serie_por_segundo.csv", encoding="utf-8") as f:
        return [(int(l["segundo_desde_injecao"]), float(l["erro_pct"])) for l in csv.DictReader(f)]


est = {}
for e, rs in por.items():
    rec = [r["tempo_ate_recuperacao_s"] for r in rs if r["recuperou"]]
    est[e] = {
        "n": len(rs), "recuperou": len(rec), "rec": rec, "rec_media": mean(rec) if rec else None,
        "pos": [r["erro_pct_por_fase"]["pos_red_button"] for r in rs],
        "total": [r["erro_pct_total"] for r in rs],
        "desp": [r["banco_apos_red_button"]["desperdicadas"] for r in rs],
        "atend": [r["banco_apos_red_button"]["atendidas"] for r in rs],
        "rej": [r["banco_apos_red_button"]["rejeitadas_503"] for r in rs],
        "falha": [r["tempo_ate_falha_s"] for r in rs],
        "primeiro": [r["tempo_ate_primeiro_erro_s"] for r in rs],
        "janela": rs[0]["janela_observada_apos_red_button_s"],
    }
spread_exp = [r["primeiro_crash_das_replicas_s"]["mais_tarde"] for r in por["exponencial"]]
todas_primeiro = [x for e in ESTRATEGIAS for x in est[e]["primeiro"]]
todas_falha = [x for e in ESTRATEGIAS for x in est[e]["falha"]]
sb, ex, ej = est["sem_backoff"], est["exponencial"], est["exponencial_jitter"]
presas = [r for r in por["sem_backoff"] if not r["recuperou"]]


def cargas_furando_fila(rodada):
    """Cargas atendidas pelo banco depois do red-button em segundos com a fila >= 90."""
    with open(LOGS / rodada / "serie_por_segundo.csv", encoding="utf-8") as f:
        return sum(int(l["banco_atendidas"] or 0) for l in csv.DictReader(f)
                   if int(l["segundo_desde_injecao"]) >= 15 and l["banco_em_fila"] and int(l["banco_em_fila"]) >= 90)


furos = {r["rodada"]: r["banco_atendidas_com_fila_cheia_apos_red_button"] for r in por["sem_backoff"]}


def lista(vals, suf="", casas=1):
    return ", ".join(br(v, casas) + suf for v in vals)


def faixa(vals, casas=1, suf=""):
    return f"{br(min(vals), casas)}{suf} a {br(max(vals), casas)}{suf}"


# ------------------------------------------------------------------ gráfico
def grafico():
    larg, alt, margem_esq, topo = 220, 120, 30, 14
    x0, x1 = -5, 75
    paineis = []
    for i, e in enumerate(ESTRATEGIAS):
        ox = i * (larg + margem_esq + 12)
        sx = lambda s: ox + margem_esq + (s - x0) / (x1 - x0) * larg
        sy = lambda v: topo + alt - v / 100 * alt
        g = [f'<text x="{ox + margem_esq + larg / 2}" y="9" class="tit">{NOME[e]}</text>']
        for v in (0, 50, 100):
            g.append(f'<line x1="{ox + margem_esq}" x2="{ox + margem_esq + larg}" y1="{sy(v)}" y2="{sy(v)}" class="grade"/>'
                     f'<text x="{ox + margem_esq - 3}" y="{sy(v) + 3}" class="eixo" text-anchor="end">{v}%</text>')
        for s, rotulo in ((0, "injeção"), (15, "red-button")):
            g.append(f'<line x1="{sx(s)}" x2="{sx(s)}" y1="{topo}" y2="{topo + alt}" class="marco"/>'
                     f'<text x="{sx(s) + 2}" y="{topo + 8}" class="eixo">{rotulo}</text>')
        for s in (0, 30, 60):
            g.append(f'<text x="{sx(s)}" y="{topo + alt + 11}" class="eixo" text-anchor="middle">{s}s</text>')
        for r in por[e]:
            pts = " ".join(f"{sx(s):.1f},{sy(v):.1f}" for s, v in serie(r["rodada"]) if x0 <= s <= x1)
            g.append(f'<polyline points="{pts}" fill="none" stroke="{COR[e]}" stroke-width="1.3" stroke-opacity=".75"/>')
        paineis.append("".join(g))
    return (f'<svg viewBox="0 0 {3 * (larg + margem_esq + 12)} {topo + alt + 16}" class="grafico">'
            + "".join(paineis) + "</svg>")


DIAGRAMA = """
<svg viewBox="0 0 640 175" class="diagrama">
  <rect x="5" y="22" width="300" height="148" rx="8" class="rede"/><text x="12" y="36" class="rotulo-rede">rede-api</text>
  <rect x="215" y="5" width="420" height="165" rx="8" class="rede rede2"/><text x="560" y="19" class="rotulo-rede">rede-dados</text>
  <rect x="20" y="62" width="120" height="66" rx="6" class="caixa"/>
  <text x="80" y="85" class="nome">cliente</text><text x="80" y="100" class="sub">40 req/s + operador</text><text x="80" y="113" class="sub">+ medição</text>
  <rect x="235" y="40" width="160" height="100" rx="6" class="caixa"/>
  <text x="315" y="62" class="nome">service-control ×12</text><text x="315" y="78" class="sub">supervisor reinicia</text><text x="315" y="91" class="sub">o processo na hora;</text><text x="315" y="104" class="sub">carrega políticas com</text><text x="315" y="117" class="sub">ESTRATEGIA de retry</text>
  <rect x="490" y="55" width="125" height="70" rx="6" class="caixa"/>
  <text x="552" y="78" class="nome">banco</text><text x="552" y="93" class="sub">2 vagas · 0,25 s/carga</text><text x="552" y="106" class="sub">fila até 100 → 503</text>
  <line x1="140" y1="95" x2="233" y2="95" class="seta"/><text x="186" y="89" class="sub">/check</text>
  <line x1="395" y1="90" x2="488" y2="90" class="seta"/><text x="442" y="84" class="sub">/carregar</text><text x="442" y="104" class="sub">/versao</text>
  <path d="M80 128 V158 H552 V127" class="seta tracejada"/><text x="315" y="153" class="sub">/admin: política com campo vazio · red-button</text>
  <defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#444"/></marker></defs>
</svg>"""

# ------------------------------------------------------------------ texto
LOG_RESUMO = "logs/&lt;rodada&gt;/resumo.json"
html = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Laudo SRE: incidente Google Cloud</title>
<style>
@page {{ size: A4; margin: 13mm 14mm; }}
body {{ font-family: "Segoe UI", Arial, sans-serif; font-size: 9.3pt; color: #1d1d1d; line-height: 1.38; }}
h1 {{ font-size: 15pt; margin: 0 0 2px; color: #123b5c; }}
h2 {{ font-size: 11.2pt; color: #123b5c; border-bottom: 1.5px solid #9db4c8; padding-bottom: 2px; margin: 13px 0 6px; }}
h3 {{ font-size: 9.8pt; margin: 9px 0 3px; color: #123b5c; }}
p {{ margin: 4px 0; text-align: justify; }}
.meta {{ color: #555; font-size: 8.6pt; margin-bottom: 6px; }}
.caixa-frase {{ background: #eef4f9; border-left: 4px solid #2c6e9e; padding: 6px 10px; margin: 6px 0; }}
table {{ border-collapse: collapse; width: 100%; margin: 5px 0; font-size: 8.4pt; }}
th, td {{ border: 1px solid #c9d3dc; padding: 3px 5px; vertical-align: top; text-align: left; }}
th {{ background: #e9eff5; }}
code {{ font-family: Consolas, monospace; font-size: 8pt; background: #f2f2f2; padding: 0 3px; border-radius: 2px; }}
pre {{ font-family: Consolas, monospace; font-size: 7.8pt; background: #f6f6f6; border: 1px solid #ddd; padding: 5px 8px; margin: 4px 0; white-space: pre-wrap; }}
q {{ font-style: italic; }}
.fonte {{ color: #555; font-size: 7.6pt; }}
.num {{ white-space: nowrap; }}
svg text {{ font-family: "Segoe UI", Arial, sans-serif; }}
.diagrama {{ width: 100%; max-height: 165px; }}
.rede {{ fill: #f4f8fb; stroke: #9db4c8; stroke-dasharray: 4 3; }} .rede2 {{ fill: none; stroke: #b6a46b; }}
.rotulo-rede {{ font-size: 9px; fill: #555; }}
.caixa {{ fill: #fff; stroke: #2c6e9e; stroke-width: 1.4; }}
.nome {{ font-size: 10.5px; font-weight: 700; text-anchor: middle; }} .sub {{ font-size: 8.5px; fill: #444; text-anchor: middle; }}
.seta {{ stroke: #444; stroke-width: 1.2; fill: none; marker-end: url(#m); }} .tracejada {{ stroke-dasharray: 4 3; }}
.grafico {{ width: 100%; }} .grade {{ stroke: #e3e3e3; }} .marco {{ stroke: #888; stroke-dasharray: 3 2; }}
.eixo {{ font-size: 7px; fill: #555; }} .tit {{ font-size: 8.5px; font-weight: 700; text-anchor: middle; }}
.quebra {{ page-break-before: always; }}
</style></head><body>

<h1>Laudo técnico: o efeito manada do Google Cloud (12/06/2025) pode acontecer conosco?</h1>
<div class="meta">Equipe de SRE: Iza Malafaia, Joanna Farias, Juliana Comparoto, Lucas Vinícius, Maria Luiza, Paulo Marrocos e Pedro Marrocos · Projeto: Ponto da Terra · 23/11/2026<br>
Artigo: Google Cloud Service Health, incidente <code>ow5i3PPK96RduMcb1SsW</code> (status.cloud.google.com) ·
Repositório: github.com/comparoto/Ponto-da-Terra, branch <code>laudo-sre-gcp</code>, pasta <code>laudo-incidente-gcp/</code></div>

<h2>Parte A: o mecanismo</h2>
<div class="caixa-frase"><b>Em uma frase:</b> uma política com campos em branco, replicada para todas as regiões, fez
um código novo e sem tratamento de erro derrubar o Service Control. Depois do conserto, as tarefas
voltaram todas juntas e sem backoff, sobrecarregaram o banco (Spanner) de que dependiam e prolongaram
a queda na região maior.</div>

<table>
<tr><th style="width:15%">Quando</th><th>Evento (citação literal do artigo)</th><th style="width:22%">Onde no artigo</th></tr>
<tr><td>29/05/2025</td><td><q>On May 29, 2025, a new feature was added to Service Control for additional quota policy checks.</q>
<q>The issue with this change was that it did not have appropriate error handling nor was it feature flag protected.</q></td><td>Incident Report › What happened?</td></tr>
<tr><td>12/06, ~10:45 PDT</td><td><q>On June 12, 2025 at ~10:45am PDT, a policy change was inserted into the regional Spanner tables that Service Control uses for policies.</q>
<q>This policy data contained unintended blank fields.</q> <q>Without the appropriate error handling, the null pointer caused the binary to crash.</q></td><td>Incident Report › What happened?</td></tr>
<tr><td>+2 min e +10 min</td><td><q>Within 2 minutes, our Site Reliability Engineering team was triaging the incident.</q>
<q>Within 10 minutes, the root cause was identified and the red-button (to disable the serving path) was being put in place.</q></td><td>Incident Report › What happened?</td></tr>
<tr><td>+25 min e +40 min</td><td><q>The red-button was ready to roll out ~25 minutes from the start of the incident.</q>
<q>Within 40 minutes of the incident, the red-button rollout was completed, and we started seeing recovery across regions, starting with the smaller ones first.</q></td><td>Incident Report › What happened?</td></tr>
<tr><td>us-central1</td><td><q>as Service Control tasks restarted, it created a herd effect on the underlying infrastructure it depends on</q>.
<q>Service Control did not have the appropriate randomized exponential backoff implemented to avoid this.</q>
<q>It took up to ~2h 40 mins to fully resolve in us-central-1</q></td><td>Incident Report › What happened?</td></tr>
<tr><td>12:48 PDT</td><td><q>All regions except us-central1 mitigated:</q> 12 June, 2025 12:48. Entre as correções:
<q>We will audit and ensure our systems employ randomized exponential backoff.</q></td><td>Mini Incident Report; Incident Report › What's our approach moving forward?</td></tr>
</table>
<p class="fonte">Observação: o próprio artigo dá horários diferentes para o início (10:45 no Incident Report, 10:49 no Mini
Incident Report, 10:51 no cabeçalho) e para o fim (13:49 no Mini Incident Report, 18:18 no cabeçalho). Usamos os
intervalos relativos do Incident Report, que são consistentes entre si.</p>

<p><b>Conceito da disciplina: efeito manada (<i>thundering herd</i>).</b> O crash em si vem de um ponto único de
falha, o Service Control, que todas as APIs consultam. Mas a parte do incidente que <i>atrasou a recuperação</i> é
um efeito manada clássico. Um evento comum (o red-button) libera muitos processos ao mesmo tempo, e todos
disputam o mesmo recurso compartilhado (a tabela no Spanner) sem coordenação e sem espaçar as tentativas. A
demanda passa da capacidade, e o recurso continua sobrecarregado mesmo depois de a causa original ter sumido.
O artigo usa o próprio termo (<q>herd effect</q>) e aponta a falta de <q>randomized exponential backoff</q>, que
é a defesa padrão contra o efeito manada. Por isso escolhemos esse conceito, e não "ponto único de falha", que
explicaria só o início da queda.</p>

<h2>Parte B: a miniatura</h2>
{DIAGRAMA}
<p class="fonte">Redes do <code>docker-compose.yml</code>. O cliente também está na <code>rede-dados</code>, só para as ações
do operador (linha tracejada); o tráfego de API passa só pela <code>rede-api</code>.</p>
<table>
<tr><th style="width:20%">Container</th><th style="width:38%">Peça do sistema real</th><th>Como representa</th></tr>
<tr><td><code>banco</code> (1)</td><td>Tabela de políticas no <b>Spanner</b> regional</td><td>Capacidade fixa: 2 consultas em paralelo, 0,25 s por carga e fila de até 100 (depois disso, 503). Conta o trabalho <b>desperdiçado</b>, isto é, cargas terminadas depois que o cliente já desistiu.</td></tr>
<tr><td><code>service-control</code> (12 réplicas)</td><td><b>Tarefas do Service Control</b> e o orquestrador que as reinicia</td><td>Carrega as políticas ao subir e confere a versão a cada 1 s. Com a quota em branco, <code>politica["quota"]["por_minuto"]</code> gera <code>TypeError</code> (o "null pointer"). O supervisor reinicia o processo na hora. A espera entre tentativas vem de <code>ESTRATEGIA</code>.</td></tr>
<tr><td><code>cliente</code> (1)</td><td><b>Clientes das APIs</b> do Google e o <b>operador</b> (SRE)</td><td>40 requisições/s distribuídas pelas réplicas. Aos 10 s, insere a política com campo vazio; 15 s depois, aciona o red-button; no fim, mede.</td></tr>
</table>

<h3>O que a miniatura não reproduz</h3>
<table>
<tr><th style="width:33%">Ponto não reproduzido</th><th>Efeito nas conclusões</th></tr>
<tr><td><b>Escala e tempo:</b> 12 réplicas e 1 região, em segundos; o real são milhares de tarefas em dezenas de regiões, em horas.</td><td>Comparamos padrões e proporções (recupera ou fica preso; quanto o retry piora), não valores absolutos. Não reproduzimos "regiões menores se recuperam primeiro".</td></tr>
<tr><td><b>Banco simulado</b> com capacidade fixa escolhida por nós; o Spanner é distribuído e tem proteções próprias.</td><td>O efeito manada só aparece quando a demanda dos reinícios passa da capacidade. Com 0,1 s por carga, nem o cenário sem backoff travou: {br(calib['banco_apos_red_button']['desperdicadas'])} cargas desperdiçadas e recuperação em {br(calib['tempo_ate_recuperacao_s'])} s (<code>logs/calibracao-custo-0.1/resumo.json</code>). A conclusão vale para o regime em que a demanda supera a capacidade, que é o que o artigo descreve.</td></tr>
<tr><td><b>Red-button instantâneo:</b> no real, o rollout levou de ~25 a ~40 min.</td><td>A nossa fase de falha é curta (15 s), e medimos a recuperação a partir do instante em que o banco aplica o botão. O tempo total de indisponibilidade não é comparável, só o comportamento depois do botão.</td></tr>
<tr><td><b>Sem intervenção humana depois do botão:</b> o Google <q>throttled task creation</q> e desviou tráfego para sair do estado preso.</td><td>Sem backoff, a miniatura pode ficar presa até o fim da janela (60 s). Ela mostra o que acontece se ninguém intervier, e não quanto tempo o Google levou intervindo.</td></tr>
<tr><td><b>Fila do banco não é estritamente FIFO</b> (semáforo do Python).</td><td>De vez em quando um pedido novo "fura a fila" e é atendido. Isso explica por que algumas rodadas sem backoff escapam por sorte (Parte C). Um banco real pode ser mais ou menos "justo".</td></tr>
</table>

<h2>Parte C: o experimento</h2>
<p><b>Método.</b> {sum(e['n'] for e in est.values())} rodadas válidas: 3 estratégias de nova tentativa × 3 repetições,
com o mesmo cenário (10 s normais, falha, red-button 15 s depois, 60 s de observação) e
{br(por['sem_backoff'][0]['requisicoes_esperadas'])} requisições por rodada. Definições (em
<code>app/analisar.py</code>): <b>tempo até a falha</b> = da aplicação da política no banco até o fim do primeiro
segundo com ≥ 50% de erro; <b>tempo até a recuperação</b> = da aplicação do red-button até o início de 5 s seguidos
com ≤ 5% de erro; <b>% de erro</b> = requisições sem HTTP 200 (timeout, 503 ou conexão recusada). Rodadas em que o
cliente ficou mais de 1 s sem enviar são invalidadas e refeitas pelo script (ver <code>IA.md</code>, erro 4). Cada
número abaixo sai de <code>{LOG_RESUMO}</code>, calculado sobre <code>cliente.jsonl</code>, <code>banco.jsonl</code> e
<code>service-control-*.jsonl</code> da mesma pasta. A consolidação está em <code>logs/comparacao.md</code>.</p>

<table>
<tr><th>Métrica (3 rodadas cada)</th><th>Sem backoff<br><span class="fonte">sem_backoff-r1..r3</span></th><th>Exponencial<br><span class="fonte">exponencial-r1..r3</span></th><th>Exponencial + jitter<br><span class="fonte">exponencial_jitter-r1..r3</span></th></tr>
<tr><td>Tempo até a falha (≥ 50% de erro)</td><td>{lista(sb['falha'], ' s')}</td><td>{lista(ex['falha'], ' s')}</td><td>{lista(ej['falha'], ' s')}</td></tr>
<tr><td>Recuperou depois do red-button</td><td><b>{sb['recuperou']} de {sb['n']}</b></td><td>{ex['recuperou']} de {ex['n']}</td><td>{ej['recuperou']} de {ej['n']}</td></tr>
<tr><td>Tempo até a recuperação</td><td>{lista(sb['rec'], ' s')}; as outras {sb['n'] - sb['recuperou']} não se recuperaram em {br(sb['janela'])} s</td><td>{lista(ex['rec'], ' s')} (média {br(ex['rec_media'])} s)</td><td>{lista(ej['rec'], ' s')} (média {br(ej['rec_media'])} s)</td></tr>
<tr><td>% de erro após o red-button</td><td>{lista(sb['pos'], '%', 2)}</td><td>{lista(ex['pos'], '%', 2)}</td><td>{lista(ej['pos'], '%', 2)}</td></tr>
<tr><td>% de erro na rodada inteira</td><td>{lista(sb['total'], '%', 2)}</td><td>{lista(ex['total'], '%', 2)}</td><td>{lista(ej['total'], '%', 2)}</td></tr>
<tr><td>Banco após o botão: cargas atendidas / desperdiçadas</td><td>{' · '.join(f'{br(a)} / {br(d)}' for a, d in zip(sb['atend'], sb['desp']))}</td><td>{' · '.join(f'{br(a)} / {br(d)}' for a, d in zip(ex['atend'], ex['desp']))}</td><td>{' · '.join(f'{br(a)} / {br(d)}' for a, d in zip(ej['atend'], ej['desp']))}</td></tr>
<tr><td>Banco após o botão: pedidos rejeitados (503)</td><td>{lista(sb['rej'])}</td><td>{lista(ex['rej'])}</td><td>{lista(ej['rej'])}</td></tr>
</table>

{grafico()}
<p class="fonte">% de requisições com erro por segundo; cada linha é uma rodada. Fonte: <code>logs/&lt;rodada&gt;/serie_por_segundo.csv</code>, gerado de <code>cliente.jsonl</code>.</p>

<h3>Comparação com o caso real</h3>
<table>
<tr><th style="width:17%">Aspecto</th><th style="width:30%">Artigo</th><th style="width:28%">Miniatura</th><th>Leitura</th></tr>
<tr><td>Até a falha</td><td>Política inserida às ~10:45; incidente começa às 10:49/10:51 (minutos).</td><td>Primeiro erro de {faixa(todas_primeiro, 3, ' s')} após a injeção; ≥ 50% de erro de {faixa(todas_falha, 0, ' s')}.</td><td>Nossas réplicas checam a versão das políticas a cada 1 s, por isso a queda vem em segundos. No real, o artigo registra minutos entre a inserção e o início do incidente.</td></tr>
<tr><td>Depois do conserto</td><td>Regiões menores se recuperam primeiro; us-central1 levou até ~2h40, por causa do <q>herd effect</q> no Spanner.</td><td>Sem backoff: {sb['recuperou']} de {sb['n']} rodadas se recuperaram; nas outras, o banco desperdiçou {lista([r['banco_apos_red_button']['desperdicadas'] for r in presas])} cargas e atendeu {lista([r['banco_apos_red_button']['atendidas'] for r in presas])}.</td><td>Mesmo mecanismo: o banco trabalha a todo vapor, mas em respostas que ninguém espera mais, e o sistema fica preso mesmo sem a causa original.</td></tr>
<tr><td>Com backoff</td><td>Correção anunciada: <q>randomized exponential backoff</q>.</td><td>Recuperação de {faixa(ex['rec'] + ej['rec'], 0, ' s')} nas 6 rodadas com backoff.</td><td>O backoff tira o sistema do estado preso, como o artigo sugere.</td></tr>
<tr><td>% de erro</td><td>Sem número: só <q>increased 503 errors</q> e <q>elevated 5xx errors</q>.</td><td>Após o botão: de {faixa(sb['pos'], 2, '%')} sem backoff, contra {faixa(ex['pos'] + ej['pos'], 2, '%')} com backoff.</td><td>Só dá para comparar qualitativamente: também observamos 503 e timeouts.</td></tr>
</table>

<h3>O que saiu diferente do esperado</h3>
<p>Esperávamos que o <b>jitter</b> fosse claramente melhor que o backoff exponencial puro, porque é o que o artigo
recomenda. Não foi: a recuperação média foi de {br(ex['rec_media'])} s no exponencial puro e de {br(ej['rec_media'])} s com
jitter, e a % de erro após o botão ficou de {faixa(ex['pos'], 2, '%')} no exponencial puro e de {faixa(ej['pos'], 2, '%')} com jitter.
Com 3 rodadas, essa diferença fica dentro da variação entre repetições. A explicação que encontramos nos logs: o jitter
existe para <b>dessincronizar</b> clientes que falham no mesmo instante, mas as nossas 12 réplicas já não falham juntas.
Cada uma só quebra quando consegue recarregar a política, e as recargas passam pela fila do banco. Nas rodadas exponenciais, o
primeiro crash das 12 réplicas se espalhou por até {lista(spread_exp, ' s', 2)} (uma rodada cada) depois da injeção (campo <code>primeiro_crash_das_replicas_s</code> do
<code>resumo.json</code>, calculado de <code>service-control-*.jsonl</code> e <code>banco.jsonl</code>). Com as falhas já
espalhadas, o exponencial puro não forma "ondas" sincronizadas, e o jitter tem pouco a corrigir. Ele faria diferença
num evento que derruba todos no mesmo instante, por exemplo o próprio banco reiniciando, com muito mais clientes.
Uma segunda surpresa reforça que o estado preso é metaestável: sem backoff, a rodada <code>sem_backoff-r2</code>
saiu sozinha em {br(sb['rec'][0]) if sb['rec'] else '—'} s, enquanto as outras duas não saíram. O campo <code>banco_atendidas_com_fila_cheia_apos_red_button</code> do <code>resumo.json</code> explica a diferença:
o banco atendeu algumas cargas mesmo com a fila em 90 ou mais, o que só é possível com pedidos furando a fila
(o semáforo do Python não é FIFO). Foram {furos['sem_backoff-r1']} cargas assim na r1, {furos['sem_backoff-r2']} na r2 e
{furos['sem_backoff-r3']} na r3. Na r2, isso aconteceu logo após o botão, e cada réplica que conseguiu carregar saiu da
manada e aliviou o banco, até a recuperação. Na r1 não bastou, e na r3 não houve nenhum. Sem backoff, sair do estado preso depende de sorte.</p>

<h2>Parte D: parecer para a diretora</h2>
<p><b>Sim, o mesmo mecanismo pode acontecer no Ponto da Terra</b>, em dois pontos do código (branch
<code>juliana-backend</code>).</p>
<p><b>1. Consulta de status da compra, sem nenhum backoff:</b> <code>src/app/(comprador)/compra/[codigo]/page.tsx</code>, linhas 46 a 51.</p>
<pre>// Enquanto o PIX/boleto estiver pendente, consulta o status a cada 4 s (o pagamento chega pelo webhook)
useEffect(() =&gt; {{
  if (!pendente) return;
  const t = setInterval(recarregar, 4000);
  return () =&gt; clearInterval(t);
}}, [pendente, recarregar]);</pre>
<p>Cada comprador com PIX ou boleto pendente consulta a API a cada 4 s, <b>com intervalo fixo, mesmo quando a resposta
é erro</b>. Se a API ou o banco (Neon) ficarem lentos ou caírem, nenhum navegador diminui o ritmo:
as tentativas continuam chegando no mesmo ritmo enquanto o serviço tenta se recuperar, como as réplicas da miniatura. É o cenário
"sem backoff" da miniatura, o único que ficou preso ({sb['n'] - sb['recuperou']} de {sb['n']} rodadas).</p>
<p><b>2. Fila de notificações, com backoff mas sem jitter:</b> <code>backend/src/worker.ts</code>, linha 28.</p>
<pre>defaultJobOptions: {{ attempts: 5, backoff: {{ type: 'exponential', delay: 1000 }}, removeOnComplete: 1000, removeOnFail: 5000 }},</pre>
<p>Se o Postgres ou o Redis caírem, todos os jobs da fila falham juntos e voltam juntos, em 1, 2, 4 e 8 s. No BullMQ
6.7.4 (a versão do <code>backend/package.json</code>), a opção <code>jitter</code> vale 0 por padrão. É a configuração
"exponencial" da miniatura: ela evitou o estado preso em todas as rodadas, mas o jitter é a proteção para falhas
simultâneas, justamente o caso de uma queda do banco.</p>

<h3>Mitigação implementada e medida: backoff exponencial com jitter</h3>
<table>
<tr><th>Métrica (3 rodadas)</th><th>Antes: sem backoff</th><th>Depois: exponencial + jitter</th><th>Fonte</th></tr>
<tr><td>Rodadas que se recuperaram</td><td>{sb['recuperou']} de {sb['n']}</td><td>{ej['recuperou']} de {ej['n']}</td><td rowspan="4"><code>{LOG_RESUMO}</code> e <code>logs/comparacao.md</code></td></tr>
<tr><td>Tempo até a recuperação</td><td>{lista(sb['rec'], ' s')} (as outras &gt; {br(sb['janela'])} s)</td><td>{lista(ej['rec'], ' s')}</td></tr>
<tr><td>% de erro após o red-button (média)</td><td>{br(mean(sb['pos']), 2)}%</td><td>{br(mean(ej['pos']), 2)}%</td></tr>
<tr><td>Cargas desperdiçadas no banco após o botão</td><td>{lista(sb['desp'])}</td><td>{lista(ej['desp'])}</td></tr>
</table>
<p>A mitigação fica em <code>app/comum.py</code> (<code>espera_antes_de_tentar</code>): a espera é sorteada entre 0 e
0,1 s × 2<sup>tentativa</sup>, com teto de 5 s.</p>

<p><b>Recomendação.</b> (1) <b>Prioridade alta:</b> no <code>page.tsx</code>, trocar o <code>setInterval</code> fixo por um
<code>setTimeout</code> que dobra a espera a cada erro (até ~60 s), sorteia o atraso (jitter) e volta a 4 s quando a
consulta dá certo. Esse é o ponto sem defesa nenhuma. (2) <b>Baixo custo:</b> no <code>worker.ts</code>, usar
<code>backoff: {{ type: 'exponential', delay: 1000, jitter: 1 }}</code>. A nossa miniatura não mediu ganho do jitter quando as
falhas já chegam espalhadas, mas ele protege justamente contra quedas simultâneas e não custa nada. (3) Seguir as outras
lições do artigo: validar dados antes de replicar e proteger código novo com feature flag. São as duas falhas que
começaram o incidente.</p>
</body></html>
"""

saida = RAIZ / "laudo" / "laudo.html"
saida.write_text(html, encoding="utf-8")
print(f"gerado: {saida}")
