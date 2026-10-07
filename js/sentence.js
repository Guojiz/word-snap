/*
 * On-device sentence check for the sentence cards. No server, no AI model.
 *
 *   1. Is the target word used?  compromise word roots (ran → run, tubers → tuber),
 *      so any inflected form counts; multi-word phrases match on roots too.
 *   2. Grammar and spelling.      Harper (Rust compiled to WebAssembly).
 *   3. One extra agreement rule.  Harper misses "The lanterns on the bridge sways";
 *      compromise finds the head noun, so a plural subject with an -s verb (or a
 *      singular one with a bare verb) is flagged — only when the subject is the
 *      noun phrase that starts the sentence, to keep false alarms rare.
 *   4. Structure.                 At least 4 words and more than the word itself
 *                                 (a missing verb is only pointed out: the tagger can be wrong).
 *
 * Any word order that is grammatical passes. What rules cannot judge is whether
 * the sentence uses the word in the right *meaning*; the card says so.
 *
 * Libraries are loaded on first use (≈8 MB compressed, cached afterwards).
 */

let libsPromise = null;

/** Load compromise + Harper once. In a browser Harper runs in a worker. */
export function load() {
  if (!libsPromise) {
    libsPromise = (async () => {
      const base = new URL("../vendor/", import.meta.url);
      const [{ default: nlp }, harper, { binary }] = await Promise.all([
        import(new URL("compromise/compromise-three.mjs", base).href),
        import(new URL("harper/index.js", base).href),
        import(new URL("harper/binary.js", base).href)
      ]);
      const inBrowser = typeof window !== "undefined" && typeof Worker !== "undefined";
      const linter = new (inBrowser ? harper.WorkerLinter : harper.LocalLinter)({ binary });
      await linter.setup();
      return { nlp, linter };
    })().catch(error => {
      libsPromise = null;
      throw error;
    });
  }
  return libsPromise;
}

/**
 * Harper checks American spelling; British spellings (favourite, organise,
 * centre, travelled) are what many textbooks teach, so they are only a tip.
 */
function americanize(word) {
  return word.toLowerCase()
    .replace(/our(s|ed|ing|ite|ites|able)?$/, "or$1")
    .replace(/is(e|es|ed|ing|ation|ations)$/, "iz$1")
    .replace(/ys(e|es|ed|ing)$/, "yz$1")
    .replace(/tre(s)?$/, "ter$1")
    .replace(/ogue(s)?$/, "og$1")
    .replace(/ence(s)?$/, "ense$1")
    .replace(/ll(ed|ing|er|ers)$/, "l$1")
    .replace(/ae/g, "e")
    .replace(/oe/g, "e");
}

function isDialectVariant(problem, suggestions) {
  const p = americanize(problem);
  return suggestions.some(s => americanize(s) === p || s.toLowerCase() === p);
}

// Lint kinds that only polish style; shown as tips, never a reason to fail.
const MINOR_KINDS = new Set(["Capitalization", "Punctuation", "Formatting", "Style", "Readability", "Enhancement", "Redundancy", "Regionalism"]);

const PRONOUNS = new Set(["i", "you", "he", "she", "it", "we", "they", "everyone", "everybody", "someone", "somebody", "nobody", "anyone", "anybody", "this", "that", "these", "those", "who", "what"]);

function terms(nlp, text) {
  const json = nlp(text).compute("root").json({ offset: true });
  const out = [];
  for (const sentence of json) {
    for (const term of sentence.terms) {
      out.push({
        text: term.text,
        normal: term.normal || term.text.toLowerCase(),
        root: term.root || term.normal || term.text.toLowerCase(),
        tags: term.tags || [],
        start: term.offset ? term.offset.start : -1,
        end: term.offset ? term.offset.start + term.offset.length : -1
      });
    }
  }
  return out;
}

/** Words of the target, as roots (so "took part in" matches "take part in"). */
function targetRoots(nlp, target) {
  const list = terms(nlp, target).filter(term => term.normal);
  return list.length ? list : String(target).toLowerCase().split(/\s+/).filter(Boolean).map(w => ({ normal: w, root: w }));
}

/** Simple suffix rules for the rare case compromise does not give a root. */
function looseForms(word) {
  const w = word.toLowerCase();
  const forms = new Set([w, w + "s", w + "es", w + "ed", w + "d", w + "ing", w + "er", w + "est", w + "ly"]);
  if (w.endsWith("y")) { forms.add(w.slice(0, -1) + "ies"); forms.add(w.slice(0, -1) + "ied"); }
  if (w.endsWith("e")) forms.add(w.slice(0, -1) + "ing");
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) { forms.add(w + w.slice(-1) + "ed"); forms.add(w + w.slice(-1) + "ing"); }
  return forms;
}

/**
 * Where (if anywhere) the sentence uses the target word or phrase, in any form.
 * Returns { found, form, start, end }.
 */
export function findTarget(nlp, target, text) {
  const want = targetRoots(nlp, target);
  const have = terms(nlp, text);
  const matches = (t, w) => t.root === w.root || t.normal === w.normal || t.root === w.normal || looseForms(w.normal).has(t.normal);
  for (let i = 0; i + want.length <= have.length; i++) {
    if (want.every((w, k) => matches(have[i + k], w))) {
      const first = have[i], last = have[i + want.length - 1];
      return { found: true, form: text.slice(first.start, last.end) || first.text, start: first.start, end: last.end };
    }
  }
  // Fallback for things compromise splits oddly (abbreviations, hyphens).
  const at = text.toLowerCase().indexOf(String(target).toLowerCase());
  if (at >= 0) return { found: true, form: text.slice(at, at + target.length), start: at, end: at + target.length };
  return { found: false, form: "", start: -1, end: -1 };
}

/** Conservative subject–verb agreement check for long subjects (see header). */
function agreementIssues(nlp, text) {
  const issues = [];
  const doc = nlp(text);
  doc.verbs().forEach(verb => {
    const json = verb.json({ offset: true })[0];
    if (!json || !json.verb) return;
    const grammar = json.verb.grammar || {};
    const main = json.terms.find(term => term.tags.includes("Verb") && !term.tags.includes("Auxiliary"));
    if (!main || main.tags.some(tag => tag === "Gerund" || tag === "Participle" || tag === "PastTense")) return;
    if (/ing$/.test(main.normal)) return;
    const subject = verb.subjects();
    const subjectText = subject.text().trim();
    // "I'd like", "She'll go": a pronoun with a contracted auxiliary.
    if (!subjectText || PRONOUNS.has(subjectText.toLowerCase().replace(/['’](d|ll|ve|re|m|s)$/, ""))) return;
    // "would/can/will + bare verb" is never an agreement error.
    if (json.terms.some(term => term.tags.includes("Modal") || term.tags.includes("Auxiliary"))) return;
    // Only when the subject is the noun phrase the sentence starts with.
    const sentenceText = verb.sentences().text().trim().toLowerCase();
    if (!sentenceText.startsWith(subjectText.toLowerCase())) return;
    // …and no other verb sits between the subject and this one: otherwise the tagger has
    // probably taken a later word for a verb ("The air … is full of particulate pollution").
    const verbStart = main.offset ? main.offset.start : -1;
    const between = doc.terms().json({ offset: true }).filter(t => {
      const term = t.terms[0];
      return term.offset && term.offset.start < verbStart && term.tags.includes("Verb") &&
        !subject.has(term.text);
    });
    if (between.length) return;
    const nouns = subject.nouns();
    if (!nouns.found) return;
    // "Two hours is a long time", "Ten dollars is enough": amounts take a singular verb.
    if (subject.has("#Value") || subject.has("#Money") || subject.has("#Duration")) return;
    const plural = nouns.isPlural().found;
    const normal = main.normal;
    let wrong = false, fix = "";
    if (main.tags.includes("Copula")) {
      if (plural && (normal === "is" || normal === "was")) { wrong = true; fix = normal === "is" ? "are" : "were"; }
      if (!plural && (normal === "are" || normal === "were")) { wrong = true; fix = normal === "are" ? "is" : "was"; }
    } else if (grammar.form === "simple-present" && main.tags.includes("PresentTense")) {
      const bare = main.tags.includes("Infinitive");
      const infinitive = json.verb.infinitive || normal;
      if (plural && !bare && /s$/.test(normal)) { wrong = true; fix = infinitive; }
      if (!plural && bare) { wrong = true; fix = nlp(infinitive).verbs().toPresentTense().text() || infinitive + "s"; }
    }
    if (!wrong || !main.offset) return;
    issues.push({
      start: main.offset.start,
      end: main.offset.start + main.offset.length,
      kind: "Agreement",
      problem: main.text,
      message: plural
        ? `“${subjectText}” is plural, so the verb should be “${fix}”.`
        : `“${subjectText}” is singular, so the verb should be “${fix}”.`,
      suggestions: fix ? [fix] : [],
      minor: false
    });
  });
  return issues;
}

/**
 * "I swaying on the swing", "He eaten the cake": an -ing form or past participle right after
 * the subject, with no verb anywhere that could carry the sentence. Harper misses these.
 */
function missingAuxiliaryIssues(nlp, text) {
  const list = nlp(text).json({ offset: true }).flatMap(sentence => sentence.terms);
  const finite = list.some(term => term.tags.includes("Verb") && (
    term.tags.some(tag => tag === "Auxiliary" || tag === "Copula" || tag === "Modal") ||
    !term.tags.some(tag => tag === "Gerund" || tag === "Participle")));
  if (finite) return [];
  for (let i = 1; i < list.length; i++) {
    const term = list[i], before = list[i - 1];
    if (!term.tags.includes("Verb") || !before.tags.includes("Noun") || !term.offset) continue;
    const subject = (before.normal || before.text).toLowerCase();
    const plural = before.tags.includes("Plural") || ["we", "you", "they"].includes(subject);
    const word = term.text;
    let suggestions;
    if (term.tags.includes("Gerund")) {
      const be = subject === "i" ? "am" : plural ? "are" : "is";
      const past = nlp(term.normal).verbs().toPastTense().text();
      suggestions = [`${be} ${word}`, past && past !== term.normal ? past : ""].filter(Boolean);
    } else if (term.tags.includes("Participle")) {
      suggestions = [`${plural || subject === "i" ? "have" : "has"} ${word}`];
    } else continue;
    return [{
      start: term.offset.start,
      end: term.offset.start + term.offset.length,
      kind: "MissingVerb",
      problem: word,
      message: `“${word}” can't be the main verb on its own; add a helping verb (e.g. “${suggestions[0]}”).`,
      suggestions,
      minor: false
    }];
  }
  return [];
}

/**
 * Check a learner's sentence for `target`.
 * Returns { ok, target:{found,form,start,end}, issues:[{start,end,kind,problem,message,suggestions,minor}], structure:[codes] }
 * structure codes: "short" (< 4 words), "onlyWord" — and "noVerb", which is only a tip.
 */
export async function checkSentence(target, text) {
  const { nlp, linter } = await load();
  const sentence = String(text || "").trim();
  const used = findTarget(nlp, target, sentence);
  const words = sentence.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  const structure = [];
  if (words.length < 4) structure.push("short");
  if (!nlp(sentence).verbs().found) structure.push("noVerb");
  if (sentence.replace(/[\s\p{P}]+/gu, " ").trim().toLowerCase() === String(target).toLowerCase()) structure.push("onlyWord");

  const lints = await linter.lint(sentence, { language: "plaintext" });
  const issues = [];
  for (const lint of lints) {
    const span = lint.span();
    const kind = lint.lint_kind();
    const problem = lint.get_problem_text();
    // A rare target word flagged as a spelling mistake is not the learner's fault.
    if ((kind === "Spelling" || kind === "Typo") && used.found && span.start >= used.start && span.end <= used.end) continue;
    const suggestions = lint.suggestions().map(s => s.get_replacement_text()).filter(s => s !== problem).slice(0, 3);
    const spelling = kind === "Spelling" || kind === "Typo";
    issues.push({
      start: span.start,
      end: span.end,
      kind: spelling && isDialectVariant(problem, suggestions) ? "Regionalism" : kind,
      problem,
      message: lint.message(),
      suggestions,
      minor: MINOR_KINDS.has(kind) || (spelling && isDialectVariant(problem, suggestions))
    });
  }
  // Harper's own agreement lints win; ours only fill the gap it leaves.
  if (!issues.some(issue => issue.kind === "Agreement")) {
    for (const extra of agreementIssues(nlp, sentence)) {
      if (!issues.some(issue => issue.start < extra.end && extra.start < issue.end)) issues.push(extra);
    }
  }
  for (const extra of missingAuxiliaryIssues(nlp, sentence)) {
    if (!issues.some(issue => issue.start < extra.end && extra.start < issue.end)) issues.push(extra);
  }
  issues.sort((a, b) => a.start - b.start);
  // "noVerb" is only a tip: the tagger sometimes reads a verb as a noun ("my sister and I walk").
  const ok = used.found && !structure.some(code => code !== "noVerb") && !issues.some(issue => !issue.minor);
  return { ok, target: used, issues, structure };
}

/** Replace one span of the sentence (apply a suggestion). */
export function applySuggestion(text, issue, replacement) {
  return text.slice(0, issue.start) + replacement + text.slice(issue.end);
}

/**
 * "I have no idea" help without AI: the translated example if there is one
 * (write your own English for it), otherwise sentence frames for the word's part of speech.
 */
export async function hintFor(target, example) {
  if (example && example.exZh) return { kind: "idea", text: example.exZh };
  const { nlp } = await load();
  const tags = terms(nlp, target).flatMap(term => term.tags);
  const w = target;
  let frames;
  if (/\s/.test(target.trim())) frames = [`I want to ${w} …`, `Last week we … ${w} …`];
  else if (tags.includes("Verb")) frames = [`I often ${w} when …`, `Yesterday she … (${w}) …`];
  else if (tags.includes("Adjective")) frames = [`It was a very ${w} …`, `Why are they so ${w}?`];
  else if (tags.includes("Adverb")) frames = [`She spoke ${w} because …`, `He ${"…"} ${w}.`];
  else frames = [`The ${w} was …`, `I have never seen such a ${w}.`];
  return { kind: "frames", text: frames.join("  /  ") };
}
