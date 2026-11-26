// Le relevé d'usage réel : il compte juste, sur les bases fictives des tests,
// et ne fait que lire (ni écriture, ni réseau).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mesurer, enMarkdown, enCsv, lireArguments, auteur, mediane } from '../outils/usage-reel.mjs';

const RACINE = fileURLToPath(new URL('../', import.meta.url));
const OUTIL = join(RACINE, 'outils', 'usage-reel.mjs');
const executer = promisify(execFile);
const lire = async nom => JSON.parse(await readFile(join(RACINE, 'tests', 'fixtures', nom), 'utf8'));

test('studio.json : une version soumise en attente, deux projets saisis, aucune décision', async () => {
  const r = mesurer(await lire('studio.json'));
  assert.equal(r.totaux.decisions, 0);
  assert.equal(r.totaux.versionsSoumises, 1);
  assert.equal(r.totaux.versionsJugees, 0);
  assert.equal(r.totaux.versionsEnAttente, 1);
  assert.equal(r.totaux.delaiMedianHeures, null);
  assert.equal(r.totaux.projets, 2);
  assert.equal(r.totaux.projetsSaisis, 2);
  assert.equal(r.totaux.personnesAttestees, 0);
  assert.deepEqual(r.parMois.map(x => x.mois), ['2026-09']);
  assert.equal(r.volume.livrables, 1);
});

test('decisions-avant.json : décisions par type et résultat, délai médian, auteur au poste', async () => {
  const capture = await lire('decisions-avant.json');
  const base = capture.ecrivains['vue-livrable'].base;
  const r = mesurer(base);
  assert.equal(r.totaux.decisions, 2);
  assert.deepEqual(r.decisionsParType.map(x => [x.type, x.resultat, x.nombre]),
    [['livrable', 'approuve', 1], ['livrable', 'retour', 1]]);
  assert.equal(r.totaux.versionsSoumises, 2);
  assert.equal(r.totaux.versionsJugees, 2);
  // Soumises le 3 novembre à 8 h, jugées le 10 à 9 h (et 9 h 00 min 05 s).
  assert.ok(Math.abs(r.totaux.delaiMedianHeures - 169) < 0.01, String(r.totaux.delaiMedianHeures));
  // Ces décisions ne portent que `qui` : le poste titulaire, qui ne désigne personne.
  assert.deepEqual(r.decisionsParAuteur, [{ auteur: 'poste direction-generale', identite: 'poste', nombre: 2 }]);
  // Le journal, lui, déclare la personne du poste : elle est active, mais non attestée.
  assert.equal(r.totaux.personnesDeclarees, 1);
  assert.equal(r.totaux.personnesAttestees, 0);
  assert.match(enMarkdown(r), /169,0 h|7,0 j/);
  // Toutes les bases de la capture se lisent, et chaque décision est comptée une fois.
  for (const [nom, e] of Object.entries(capture.ecrivains)) {
    const x = mesurer(e.base);
    assert.equal(x.totaux.decisions, (e.base.decisions || []).length, nom);
  }
});

const ALICE = { par: 'la-fusee', userId: 'user-alice', nom: 'Alice Martin', at: '2026-10-02T10:00:00.000Z', empreinte: 'e'.repeat(64), sceau: 's'.repeat(64) };
function baseComplete() {
  return {
    schema: 5,
    personnes: [{ id: 'P-da', nom: 'Sacha Martin', poste: 'da' }],
    feedbacks: [
      { id: 'FB-1', canal: 'message', quand: '2026-10-03' },
      { id: 'FB-2', canal: 'message', quand: '2026-10-04' },
      { id: 'FB-3', canal: 'seance', quand: '2026-08-30' },
      { id: 'FB-4', quand: '2026-10-05' },
    ],
    projets: [
      { id: 'PRO-a', cree_le: '2026-10-01T08:00:00.000Z',
        partages: { cadrage: { jeton: 'a'.repeat(24), cree_le: '2026-10-02T08:00:00.000Z' } },
        partagesRevoques: [{ doc: 'cadrage', jeton: 'b'.repeat(24), cree_le: '2026-09-20T08:00:00.000Z', revoque_le: '2026-10-02T07:59:00.000Z' }],
        preuvesRemise: [{ id: 'REM-1', remis_le: '2026-10-09', quand: '2026-10-10T08:00:00.000Z' }],
        livrables: [{ id: 'L-a', version: 2,
          versions: [
            { n: 1, soumis_le: '2026-10-01T08:00:00.000Z', verdict: 'retour', juge_le: '2026-10-01T10:00:00.000Z' },
            { n: 2, soumis_le: '2026-10-02T08:00:00.000Z', verdict: 'approuve', juge_le: '2026-10-02T14:00:00.000Z' },
          ],
          annotations: [{ id: 'AN-1', quand: '2026-10-01T09:00:00.000Z' }],
          fichiers: [{ id: 'F-1', type: 'bat', quand: '2026-10-05T09:00:00.000Z' }, { id: 'F-2', type: 'asset', quand: '2026-10-05T09:00:00.000Z' }] }] },
      { id: 'PRJ-XC-001', cree_le: '2026-09-15T08:00:00.000Z', releve: { source: 'corpus' },
        livrables: [{ id: 'L-b', versions: [{ n: 1, soumis_le: '2026-09-15T08:00:00.000Z' }] }] },
    ],
    decisions: [
      { id: 'DEC-1', type: 'livrable', verdict: 'retour', quand: '2026-10-01T10:00:00.000Z', qui: 'creation', acteur: { personneId: null, nom: 'Alice Martin' }, attestation: ALICE },
      { id: 'DEC-2', type: 'livrable', verdict: 'approuve', quand: '2026-10-02T14:00:00.000Z', qui: 'creation', acteur: { personneId: 'P-da', nom: 'Sacha Martin' } },
      { id: 'DEC-3', type: 'piste', verdict: 'hors', quand: '2026-08-01T14:00:00.000Z', qui: 'creation' },
    ],
    journal: [
      { quand: '2026-10-01T10:00:01.000Z', qui: 'creation', action: 'création', attestation: ALICE },
      { quand: '2026-10-02T10:00:01.000Z', qui: 'creation', action: 'modification', acteur: { personneId: 'P-da', nom: 'Sacha Martin' } },
      { quand: '2026-10-02T11:00:01.000Z', qui: 'creation', action: 'modification' },
    ],
    // Toujours le titulaire : ne mesure rien, n'est pas compté.
    lectures: [{ type: 'projets', id: 'PRO-a', qui: 'creation', quand: '2026-10-02T09:00:00.000Z' }],
  };
}

test('une base complète : canaux, annotations, fichiers, liens, remises, personnes attestées et déclarées', () => {
  const r = mesurer(baseComplete());
  assert.equal(r.totaux.decisions, 3);
  assert.equal(r.totaux.versionsSoumises, 3);
  assert.equal(r.totaux.versionsJugees, 2);
  assert.equal(r.totaux.versionsEnAttente, 1);
  assert.equal(r.totaux.delaiMedianHeures, 4); // 2 h et 6 h
  assert.deepEqual(r.retoursParCanal.map(x => [x.canal, x.nombre]), [['message', 2], ['non renseigné', 1], ['seance', 1]]);
  assert.equal(r.totaux.annotations, 1);
  assert.deepEqual(r.fichiersParType.map(x => [x.type, x.nombre]), [['asset', 1], ['bat', 1]]);
  assert.equal(r.totaux.liens, 2, 'le lien actif et le lien révoqué');
  assert.equal(r.totaux.remises, 1);
  assert.equal(r.totaux.projets, 2);
  assert.equal(r.totaux.projetsSaisis, 1);
  assert.equal(r.volume.projetsReleves, 1);
  assert.deepEqual(r.decisionsParAuteur.map(x => [x.auteur, x.identite, x.nombre]),
    [['Alice Martin', 'attestée', 1], ['poste creation', 'poste', 1], ['Sacha Martin', 'déclarée', 1]]);
  assert.equal(r.totaux.personnesAttestees, 1);
  assert.equal(r.totaux.personnesDeclarees, 1);
  const octobre = r.parMois.find(x => x.mois === '2026-10');
  assert.equal(octobre.personnesAttestees, 1);
  assert.equal(octobre.personnesDeclarees, 1);
  assert.equal(octobre.gestesJournal, 3);
  assert.equal(r.volume.lectures, 1);
  assert.ok(!JSON.stringify(r.parMois).includes('lectures'));
});

test('--depuis écarte ce qui est plus ancien, et le dit', () => {
  const r = mesurer(baseComplete(), { depuis: '2026-10-01' });
  assert.equal(r.totaux.decisions, 2);
  assert.equal(r.totaux.versionsSoumises, 2);
  assert.equal(r.totaux.retours, 3);
  assert.equal(r.totaux.liens, 1);
  assert.equal(r.totaux.projets, 1);
  assert.ok(r.ecartees.avant >= 5);
  assert.deepEqual(r.parMois.map(x => x.mois), ['2026-10']);
  assert.match(enMarkdown(r), /depuis le 2026-10-01/);
  assert.throws(() => mesurer(baseComplete(), { depuis: '2026-13-01' }), /AAAA-MM-JJ/);
});

test('--anonyme remplace chaque nom par un rang, partout', () => {
  const r = mesurer(baseComplete(), { anonyme: true });
  const texte = enMarkdown(r) + enCsv(r);
  assert.doesNotMatch(texte, /Alice|Sacha/);
  assert.match(texte, /Personne 1/);
  assert.match(texte, /Personne 2/);
});

test('auteur : attestation, puis acteur déclaré, puis poste seul', () => {
  assert.equal(auteur({ attestation: ALICE, acteur: { nom: 'Autre' } }).identite, 'attestée');
  assert.equal(auteur({ attestation: { par: 'navigateur', userId: 'x' }, acteur: { nom: 'Camille' } }).identite, 'déclarée');
  assert.equal(auteur({ qui: 'creation' }).identite, 'poste');
  assert.equal(mediane([3, 1, 2]), 2);
  assert.equal(mediane([]), null);
});

test('la ligne de commande refuse d’écrire et laisse la copie intacte', async () => {
  assert.throws(() => lireArguments(['base.json', '--sortie', 'x.md']), /n'écrit aucun fichier/);
  assert.throws(() => lireArguments(['base.json', '-o', 'x.md']), /n'écrit aucun fichier/);
  assert.throws(() => lireArguments(['base.json', '--format', 'xlsx']), /md ou csv/);
  assert.throws(() => lireArguments(['base.json', '--inconnue']), /Option inconnue/);
  const dossier = await mkdtemp(join(tmpdir(), 'usage-reel-'));
  try {
    const copie = join(dossier, 'copie.json');
    const texte = JSON.stringify(baseComplete());
    await writeFile(copie, texte);
    const avant = await stat(copie);
    const { stdout } = await executer(process.execPath, [OUTIL, copie, '--format', 'csv', '--depuis', '2026-09-01']);
    assert.match(stdout, /^mesure,mois,cle,valeur\n/);
    assert.match(stdout, /\ndecisions,tout,,2\n/);
    const md = await executer(process.execPath, [OUTIL, copie]);
    assert.match(md.stdout, /^# Usage réel de La Barre/);
    assert.match(md.stdout, /lectures\[\]\.qui/);
    const apres = await stat(copie);
    assert.equal(apres.mtimeMs, avant.mtimeMs);
    assert.equal(createHash('sha256').update(await readFile(copie)).digest('hex'), createHash('sha256').update(texte).digest('hex'));
    await assert.rejects(executer(process.execPath, [OUTIL, copie, '--ecrire']), e => e.code === 2 && /n'écrit aucun fichier/.test(e.stderr));
  } finally { await rm(dossier, { recursive: true, force: true }); }
});

test('le relevé n’emploie ni le réseau ni l’écriture', async () => {
  const source = await readFile(OUTIL, 'utf8');
  for (const interdit of [/node:(http|https|net|dgram|tls)/, /\bfetch\s*\(/, /writeFile|appendFile|createWriteStream|openSync|mkdir|rmSync|unlink/])
    assert.doesNotMatch(source, interdit);
});
